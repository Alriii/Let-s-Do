<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpWord\Element\ListItem;
use PhpOffice\PhpWord\Element\ListItemRun;
use PhpOffice\PhpWord\Element\Table;
use PhpOffice\PhpWord\Element\Text;
use PhpOffice\PhpWord\Element\TextRun;
use PhpOffice\PhpWord\IOFactory;
use Smalot\PdfParser\Parser;

// extract text from uploaded files (pdf, docx, txt)
class DocumentExtractorService
{
    private const MAX_CHARS = 15_000;

    private const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

    private const ALLOWED_MIME = [
        'application/pdf',
        'application/x-pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'application/octet-stream',
    ];

    private const ALLOWED_EXT = ['pdf', 'docx', 'doc', 'txt'];

    public function __construct(
        protected GeminiService $gemini,
    ) {}

    public function extract(UploadedFile $file): array
    {
        // check size
        if ($file->getSize() > self::MAX_BYTES) {
            return $this->err('File is too large. Maximum allowed size is 15 MB.');
        }

        // check file type
        $ext = strtolower($file->getClientOriginalExtension());
        $mime = $file->getMimeType() ?? '';

        if (! in_array($ext, self::ALLOWED_EXT, true) && ! in_array($mime, self::ALLOWED_MIME, true)) {
            return $this->err('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
        }

        $text = '';

        try {
            $text = match (true) {
                $ext === 'pdf' || str_contains($mime, 'pdf') => $this->extractPdf($file),
                $ext === 'docx' || $ext === 'doc'
                    || str_contains($mime, 'wordprocessingml')
                    || str_contains($mime, 'msword') => $this->extractDocx($file),
                default => $this->extractTxt($file),
            };
        } catch (\Throwable $e) {
            Log::warning('DocumentExtractor parser warning: '.$e->getMessage());
        }

        $text = $this->cleanText($text);

        // if empty pdf, try gemini ocr
        if (empty(trim($text)) && ($ext === 'pdf' || str_contains($mime, 'pdf'))) {
            try {
                $transcribed = $this->gemini->transcribeDocument($file);
                if (! empty($transcribed)) {
                    $text = $this->cleanText($transcribed);
                }
            } catch (\Throwable $e) {
                Log::warning('Gemini transcription failed: '.$e->getMessage());
            }
        }

        if (empty(trim($text))) {
            return $this->err('No readable text found in the file. Try copying the content manually.');
        }

        $truncated = strlen($text) > self::MAX_CHARS;
        $text = $truncated ? substr($text, 0, self::MAX_CHARS) : $text;

        return [
            'text' => $text,
            'truncated' => $truncated,
            'char_count' => strlen($text),
        ];
    }

    private function extractPdf(UploadedFile $file): string
    {
        $parser = new Parser;
        $pdf = $parser->parseFile($file->getRealPath());

        return $pdf->getText();
    }

    private function extractDocx(UploadedFile $file): string
    {
        $phpWord = IOFactory::load($file->getRealPath());
        $text = '';

        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                $text .= $this->readWordElement($element);
            }
        }

        return $text;
    }

    private function readWordElement(mixed $element): string
    {
        $text = '';

        if ($element instanceof TextRun
            || $element instanceof ListItem
            || $element instanceof ListItemRun
        ) {
            foreach ($element->getElements() as $child) {
                $text .= $this->readWordElement($child);
            }
            $text .= "\n";
        } elseif ($element instanceof Text) {
            $text .= $element->getText();
        } elseif ($element instanceof Table) {
            foreach ($element->getRows() as $row) {
                foreach ($row->getCells() as $cell) {
                    foreach ($cell->getElements() as $child) {
                        $text .= $this->readWordElement($child).' | ';
                    }
                }
                $text .= "\n";
            }
        } elseif (method_exists($element, 'getElements')) {
            foreach ($element->getElements() as $child) {
                $text .= $this->readWordElement($child);
            }
        }

        return $text;
    }

    private function extractTxt(UploadedFile $file): string
    {
        return file_get_contents($file->getRealPath()) ?: '';
    }

    // clean up whitespace
    private function cleanText(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = str_replace("\0", '', $text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text) ?? $text;

        return trim($text);
    }

    /** @return array{text: string, truncated: bool, char_count: int, error: string} */
    private function err(string $message): array
    {
        return ['text' => '', 'truncated' => false, 'char_count' => 0, 'error' => $message];
    }
}
