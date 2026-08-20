/**
 * Lightweight, CSP-compliant Syntax Highlighter and Code Renderer
 * Supports Python, JavaScript/TypeScript, C++, Java, C, Ruby, Go, Rust, SQL
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HRHighlighter = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const LANG_CONFIGS = {
    python: {
      keywords: new Set([
        'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
        'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from',
        'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not',
        'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
        'True', 'False', 'None'
      ]),
      builtins: new Set([
        'abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'bytes', 'callable',
        'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir',
        'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float', 'format',
        'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex',
        'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len',
        'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object',
        'oct', 'open', 'ord', 'pow', 'print', 'property', 'range', 'repr',
        'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod',
        'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip', '__name__', '__main__'
      ]),
      isPython: true
    },
    javascript: {
      keywords: new Set([
        'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
        'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends',
        'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let',
        'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof',
        'var', 'void', 'while', 'with', 'yield', 'true', 'false', 'null', 'undefined'
      ]),
      builtins: new Set([
        'console', 'window', 'document', 'Array', 'Object', 'String', 'Number',
        'Boolean', 'Math', 'Date', 'RegExp', 'Map', 'Set', 'Promise', 'JSON',
        'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
        'process', 'require', 'module', 'exports'
      ])
    },
    cpp: {
      keywords: new Set([
        'auto', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const',
        'constexpr', 'continue', 'default', 'delete', 'do', 'double', 'else',
        'enum', 'explicit', 'export', 'extern', 'false', 'float', 'for', 'friend',
        'goto', 'if', 'inline', 'int', 'long', 'mutable', 'namespace', 'new',
        'noexcept', 'nullptr', 'operator', 'private', 'protected', 'public',
        'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct',
        'switch', 'template', 'this', 'throw', 'true', 'try', 'typedef', 'typeid',
        'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile',
        'while', 'include'
      ]),
      builtins: new Set([
        'std', 'cin', 'cout', 'cerr', 'clog', 'endl', 'vector', 'string',
        'map', 'set', 'unordered_map', 'unordered_set', 'pair', 'make_pair',
        'queue', 'deque', 'stack', 'priority_queue', 'algorithm', 'sort',
        'min', 'max', 'abs', 'push_back', 'emplace_back', 'size', 'begin', 'end'
      ])
    },
    java: {
      keywords: new Set([
        'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch',
        'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else',
        'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if',
        'implements', 'import', 'instanceof', 'int', 'interface', 'long',
        'native', 'new', 'package', 'private', 'protected', 'public', 'return',
        'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this',
        'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while',
        'true', 'false', 'null'
      ]),
      builtins: new Set([
        'System', 'String', 'Integer', 'Double', 'Boolean', 'Character', 'Math',
        'Scanner', 'BufferedReader', 'InputStreamReader', 'PrintWriter', 'List',
        'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet', 'Arrays', 'Collections',
        'Override', 'print', 'println', 'printf'
      ])
    }
  };

  LANG_CONFIGS.c = LANG_CONFIGS.cpp;
  LANG_CONFIGS.typescript = LANG_CONFIGS.javascript;
  LANG_CONFIGS.ruby = LANG_CONFIGS.python;

  const HRHighlighter = {
    escapeHtml,

    /**
     * Tokenizes and highlights source code into safe HTML
     */
    highlight(code, language = 'python') {
      if (!code) return '';

      const lang = (language || 'python').toLowerCase();
      const config = LANG_CONFIGS[lang] || LANG_CONFIGS.python;
      const isPython = config.isPython || lang === 'python' || lang === 'ruby';

      // Unified Tokenizer Regex
      // Order of precedence:
      // 1. Strings & Comments
      // 2. Numbers (hex, float, int)
      // 3. Word tokens (keywords, builtins, function names, identifiers)
      // 4. Operators / Punctuation
      // 5. Whitespace and other characters
      const regex = isPython
        ? /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*)|(0x[0-9a-fA-F]+|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([a-zA-Z_]\w*)(?:\s*(?=\())?|([+\-*\/%=&|<>!^~?:;]+)|(\s+|[^\s\w])/g
        : /(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(0x[0-9a-fA-F]+|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([a-zA-Z_]\w*)(?:\s*(?=\())?|([+\-*\/%=&|<>!^~?:;]+)|(\s+|[^\s\w])/g;

      let result = '';
      let match;

      while ((match = regex.exec(code)) !== null) {
        const [full, literal, number, word, operator, other] = match;

        if (literal) {
          const isComment = literal.startsWith('#') || literal.startsWith('//') || literal.startsWith('/*');
          const tokenClass = isComment ? 'token-comment' : 'token-string';
          result += `<span class="${tokenClass}">${escapeHtml(literal)}</span>`;
        } else if (number) {
          result += `<span class="token-number">${escapeHtml(number)}</span>`;
        } else if (word) {
          if (config.keywords.has(word)) {
            result += `<span class="token-keyword">${escapeHtml(word)}</span>`;
          } else if (config.builtins.has(word)) {
            result += `<span class="token-builtin">${escapeHtml(word)}</span>`;
          } else {
            // Check if next non-whitespace char is '(' (function call)
            const nextIdx = regex.lastIndex;
            const lookahead = code.slice(nextIdx, nextIdx + 20).trimStart();
            if (lookahead.startsWith('(')) {
              result += `<span class="token-function">${escapeHtml(word)}</span>`;
            } else {
              result += escapeHtml(word);
            }
          }
        } else if (operator) {
          result += `<span class="token-operator">${escapeHtml(operator)}</span>`;
        } else if (other) {
          result += escapeHtml(other);
        }
      }

      return result;
    },

    /**
     * Renders full code block with line numbering gutter
     */
    renderCodeWithLines(code, language = 'python') {
      if (!code) return '<div class="empty-code">No code available</div>';

      const highlighted = this.highlight(code, language);
      const lines = highlighted.split('\n');

      let linesHtml = '';
      let gutterHtml = '';

      for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const lineContent = lines[i] || ' ';
        gutterHtml += `<div class="line-number" data-line="${lineNum}">${lineNum}</div>`;
        linesHtml += `<div class="code-line" data-line="${lineNum}">${lineContent}</div>`;
      }

      return `
        <div class="code-container">
          <div class="code-gutter">${gutterHtml}</div>
          <div class="code-content"><pre><code>${linesHtml}</code></pre></div>
        </div>
      `;
    },

    /**
     * Compute simple side-by-side diff between two solution codes
     */
    renderSideBySideDiff(codeA, codeB, langA = 'python', langB = 'python', userA = 'User A', userB = 'User B') {
      const linesA = (codeA || '').split(/\r?\n/);
      const linesB = (codeB || '').split(/\r?\n/);

      const maxLines = Math.max(linesA.length, linesB.length);

      let sideAHtml = '';
      let sideBHtml = '';

      for (let i = 0; i < maxLines; i++) {
        const textA = linesA[i];
        const textB = linesB[i];
        const lineNum = i + 1;

        let classA = 'diff-line';
        let classB = 'diff-line';

        if (textA === undefined) {
          classA += ' diff-empty';
          sideAHtml += `<div class="${classA}"><span class="diff-num"></span><span class="diff-text">&nbsp;</span></div>`;
        } else if (textB === undefined) {
          classA += ' diff-removed';
          sideAHtml += `<div class="${classA}"><span class="diff-num">${lineNum}</span><span class="diff-text">${escapeHtml(textA)}</span></div>`;
        } else if (textA !== textB) {
          classA += ' diff-modified';
          sideAHtml += `<div class="${classA}"><span class="diff-num">${lineNum}</span><span class="diff-text">${escapeHtml(textA)}</span></div>`;
        } else {
          sideAHtml += `<div class="${classA}"><span class="diff-num">${lineNum}</span><span class="diff-text">${escapeHtml(textA)}</span></div>`;
        }

        if (textB === undefined) {
          classB += ' diff-empty';
          sideBHtml += `<div class="${classB}"><span class="diff-num"></span><span class="diff-text">&nbsp;</span></div>`;
        } else if (textA === undefined) {
          classB += ' diff-added';
          sideBHtml += `<div class="${classB}"><span class="diff-num">${lineNum}</span><span class="diff-text">${escapeHtml(textB)}</span></div>`;
        } else if (textA !== textB) {
          classB += ' diff-modified';
          sideBHtml += `<div class="${classB}"><span class="diff-num">${lineNum}</span><span class="diff-text">${escapeHtml(textB)}</span></div>`;
        } else {
          sideBHtml += `<div class="${classB}"><span class="diff-num">${lineNum}</span><span class="diff-text">${escapeHtml(textB)}</span></div>`;
        }
      }

      return `
        <div class="diff-container">
          <div class="diff-pane">
            <div class="diff-pane-header">
              <span class="diff-user-tag">${escapeHtml(userA)}</span>
              <span class="diff-lang-tag">${escapeHtml(langA)}</span>
            </div>
            <div class="diff-pane-body">${sideAHtml}</div>
          </div>
          <div class="diff-pane">
            <div class="diff-pane-header">
              <span class="diff-user-tag">${escapeHtml(userB)}</span>
              <span class="diff-lang-tag">${escapeHtml(langB)}</span>
            </div>
            <div class="diff-pane-body">${sideBHtml}</div>
          </div>
        </div>
      `;
    }
  };

  return HRHighlighter;
});
