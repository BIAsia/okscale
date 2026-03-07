import { useState } from 'preact/hooks';

type CodeBlockProps = {
  code: string;
  language: string;
};

export function CodeBlock(props: CodeBlockProps) {
  var [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(props.code).then(function () {
      setCopied(true);
      setTimeout(function () {
        setCopied(false);
      }, 2000);
    });
  }

  var languageLabel = props.language === 'javascript' ? 'JS' : props.language.toUpperCase();

  return (
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-block-language text-small">{languageLabel}</span>
        <button
          type="button"
          class="code-block-copy-btn"
          onClick={handleCopy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M13.3333 6H7.33333C6.59695 6 6 6.59695 6 7.33333V13.3333C6 14.0697 6.59695 14.6667 7.33333 14.6667H13.3333C14.0697 14.6667 14.6667 14.0697 14.6667 13.3333V7.33333C14.6667 6.59695 14.0697 6 13.3333 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M3.33333 10H2.66667C2.31304 10 1.97391 9.85952 1.72386 9.60947C1.47381 9.35942 1.33333 9.02029 1.33333 8.66667V2.66667C1.33333 2.31304 1.47381 1.97391 1.72386 1.72386C1.97391 1.47381 2.31304 1.33333 2.66667 1.33333H8.66667C9.02029 1.33333 9.35942 1.47381 9.60947 1.72386C9.85952 1.97391 10 2.31304 10 2.66667V3.33333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          )}
          <span class="code-block-copy-text text-small">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre class="code-block" aria-label={`${props.language} code example`}><code class="text-code">{props.code}</code></pre>
    </div>
  );
}
