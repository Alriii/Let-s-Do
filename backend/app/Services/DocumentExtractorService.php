<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

/**
 * Extracts plain text from uploaded documents (PDF, DOCX, TXT).
 * Enforces a character limit and returns a truncated flag when exceeded.
 */
class DocumentExtractorService
{
    private const MAX_CHARS   = 15_000;
    private const MAX_BYTES   = 10 * 1024 * 1024; // 10 MB
    private const ALLOWED_MIME = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
    ];
    private const ALLOWED_EXT = ['pdf', 'docx', 'doc', 'txt'];

    /**
     * @return array{text: string, truncated: bool, char_count: int, error?: string}
     */
    public function extract(UploadedFile $file): array
    {
        // Validate size
        if ($file->getSize() > self::MAX_BYTES) {
            return $this->err('File is too large. Maximum allowed size is 10 MB.');
        }

        // Validate type
        $ext  = strtolower($file->getClientOriginalExtension());
        $mime = $file->getMimeType() ?? '';

        if (! in_array($ext, self::ALLOWED_EXT, true) && ! in_array($mime, self::ALLOWED_MIME, true)) {
            return $this->err('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
        }

        try {
            $text = match (true) {
                $ext === 'pdf'  || str_contains($mime, 'pdf')  => $this->extractPdf($file),
                $ext === 'docx' || $ext === 'doc'
                    || str_contains($mime, 'wordprocessingml')
                    || str_contains($mime, 'msword')           => $this->extractDocx($file),
                default                                        => $this->extractTxt($file),
            };
        } catch (\Throwable $e) {
            Log::warning('DocumentExtractor failed: ' . $e->getMessage());
            return $this->err('Could not read the file. It may be corrupted or password-protected.');
        }

        $text = $this->cleanText($text);

        if (empty(trim($text))) {
            return $this->err('No readable text found in the file. Try copying the content manually.');
        }

        $truncated = strlen($text) > self::MAX_CHARS;
        $text      = $truncated ? substr($text, 0, self::MAX_CHARS) : $text;

        return [
            'text'       => $text,
            'truncated'  => $truncated,
            'char_count' => strlen($text),
        ];
    }

    // ─── Extractors ───────────────────────────────────────────────────────────

    private function extractPdf(UploadedFile $file): string
    {
        $parser   = new \Smalot\PdfParser\Parser();
        $pdf      = $parser->parseFile($file->getRealPath());
        return $pdf->getText();
    }

    private function extractDocx(UploadedFile $file): string
    {
        $phpWord  = \PhpOffice\PhpWord\IOFactory::load($file->getRealPath());
        $text     = '';

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

        if ($element instanceof \PhpOffice\PhpWord\Element\TextRun
            || $element instanceof \PhpOffice\PhpWord\Element\ListItem
            || $element instanceof \PhpOffice\PhpWord\Element\ListItemRun
        ) {
            foreach ($element->getElements() as $child) {
                $text .= $this->readWordElement($child);
            }
            $text .= "\n";
        } elseif ($element instanceof \PhpOffice\PhpWord\Element\Text) {
            $text .= $element->getText();
        } elseif ($element instanceof \PhpOffice\PhpWord\Element\Table) {
            foreach ($element->getRows() as $row) {
                foreach ($row->getCells() as $cell) {
                    foreach ($cell->getElements() as $child) {
                        $text .= $this->readWordElement($child) . ' | ';
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

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function cleanText(string $text): string
    {
        // Normalize line endings, strip null bytes, collapse 3+ blank lines
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
