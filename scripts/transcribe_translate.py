import argparse
import json
import re
from pathlib import Path

from faster_whisper import WhisperModel
from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer


LANG_ALIASES = {
    "zh-cn": "zh",
    "zh-tw": "zh",
    "jw": "jv",
    "pt-br": "pt",
}


def normalize_lang(code: str) -> str:
    code = (code or "").strip().lower()
    return LANG_ALIASES.get(code, code)


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def postprocess_mongolian(text: str) -> str:
    text = normalize_text(text)
    replacements = {
        "Энэ нь ": "Энэ ",
        "Тийм учраас": "Тиймээс",
        "байж байна": "байна",
        "байгаа юм": "юм",
        "Та нар": "Та бүхэн",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    return text.strip()


def translate_texts(texts, source_lang, target_lang, tokenizer, model):
    translated = []
    tokenizer.src_lang = source_lang

    batch_size = 8
    for i in range(0, len(texts), batch_size):
        batch = [normalize_text(t) for t in texts[i : i + batch_size]]
        safe_batch = [t if t else " " for t in batch]

        encoded = tokenizer(
            safe_batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
        )

        generated_tokens = model.generate(
            **encoded,
            forced_bos_token_id=tokenizer.get_lang_id(target_lang),
            max_length=512,
            num_beams=4,
        )

        decoded = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)

        for original_text, result in zip(batch, decoded):
            translated.append(postprocess_mongolian(result) if original_text else "")

    return translated


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--target-language", default="mn")
    parser.add_argument("--whisper-model", default="tiny")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    target_lang = normalize_lang(args.target_language)

    whisper_model = WhisperModel(args.whisper_model, device="cpu", compute_type="int8")
    segments, info = whisper_model.transcribe(
        str(input_path),
        beam_size=1,
        vad_filter=True,
        condition_on_previous_text=False,
    )

    raw_segments = []
    original_texts = []

    for seg in segments:
        text = normalize_text(seg.text)
        if not text:
            continue

        raw_segments.append(
            {
                "start": round(float(seg.start), 2),
                "end": round(float(seg.end), 2),
                "sourceText": text,
            }
        )
        original_texts.append(text)

    if not raw_segments:
        raise RuntimeError("No speech was detected in the extracted audio.")

    detected_language = normalize_lang((info.language or "").strip())
    translated_texts = list(original_texts)

    needs_translation = detected_language and detected_language != target_lang and len(original_texts) > 0

    if needs_translation:
        tokenizer = M2M100Tokenizer.from_pretrained("facebook/m2m100_418M")
        model = M2M100ForConditionalGeneration.from_pretrained("facebook/m2m100_418M")
        translated_texts = translate_texts(
            original_texts,
            detected_language,
            target_lang,
            tokenizer,
            model,
        )
    else:
        translated_texts = [postprocess_mongolian(text) for text in original_texts]

    final_segments = []
    for i, seg in enumerate(raw_segments):
        final_segments.append(
            {
                "start": seg["start"],
                "end": seg["end"],
                "sourceText": seg["sourceText"],
                "mongolianText": translated_texts[i],
            }
        )

    result = {
        "detected_language": detected_language,
        "target_language": target_lang,
        "full_transcript": " ".join(original_texts).strip(),
        "full_translation": " ".join(translated_texts).strip(),
        "segments": final_segments,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
