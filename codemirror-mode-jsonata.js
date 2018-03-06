CodeMirror.defineMode('jsonata', function () {
  /**
   * An array of operators in JSONata.
   *
   * @type {Array<String>}
   */
  const OPERATORS = [
    '.',
    '[',
    ']',
    '{',
    '}',
    '(',
    ')',
    ',',
    '@',
    '#',
    ';',
    ':',
    '?',
    '+',
    '-',
    '*',
    '/',
    '%',
    '|',
    '=',
    '<',
    '>',
    '^',
    '**',
    '..',
    ':=',
    '!=',
    '<=',
    '>=',
    '~>',
    'and',
    'or',
    'in',
    '&',
    '!',
    '~'
  ];

  /**
   * An array of reserved keywords in JSONata.
   *
   * @type {Array<String>}
   */
  const KEYWORDS = [
    'true',
    'false',
    'null'
  ];

  /**
   * An array of JSONata built-in methods.
   *
   * @type {Array<String>}
   */
  const BUILTIN_METHODS = [
    'string',
    'length',
    'substring',
    'substringBefore',
    'substringAfter',
    'uppercase',
    'lowercase',
    'trim',
    'pad',
    'contains',
    'split',
    'join',
    'match',
    'replace',
    'now',
    'fromMillis',
    'formatNumber',
    'formatBase',
    'base64encode',
    'base64decode',
    'number',
    'abs',
    'floor',
    'ceil',
    'round',
    'power',
    'sqrt',
    'random',
    'millis',
    'toMillis',
    'sum',
    'max',
    'min',
    'average',
    'boolean',
    'not',
    'exists',
    'count',
    'append',
    'sort',
    'reverse',
    'shuffle',
    'zip',
    'keys',
    'lookup',
    'spread',
    'merge',
    'sift',
    'each',
    'map',
    'filter',
    'reduce',
    'sift'
  ];

  /**
   * An object with styles for each token in JSONata (mapped onto CodeMirror styles).
   *
   * @type {Object<String>}
   */
  const TOKENS = {
    KEYWORD: 'keyword',
    NUMBER: 'number',
    VARIABLE: 'variable-2',
    OPERATOR: 'operator',
    STRING: 'string',
    BUILTIN: 'builtin',
    ATTRIBUTE: 'attribute',
    ERROR: 'error'
  };

  /**
   * Regular expression for checking whitespaces.
   *
   * @type {RegExp}
   */
  const WHITESPACE_REGEX = /\s/;

  /**
   * Regular expression for checking for alpha characters only.
   *
   * @type {RegExp}
   */
  const ALPHA_REGEX = /[a-zA-Z]/;

  /**
   * Regular expression for checking for JSONata numbers.
   *
   * @type {RegExp}
   */
  const JSONATA_NUMBER_REGEX = /^-?(0|([1-9][0-9]*))(\.[0-9]+)?([Ee][-+]?[0-9]+)?/;

  /**
   * Regular expression to check against possible variable declaration in JSONata.
   *
   * @type {RegExp}
   */
  const JSONATA_VARIABLE_REGEX = /[a-zA-Z0-9_-]/;

  return {
    token: function (stream) {
      const peek = (n = 0) => stream.string[stream.pos + n];
      const consume = (chars = '') => chars.split('').every(char => stream.eat(char));

      // EOL (End of Line)
      if (stream.eol()) {
        return null;
      }

      // Skip whitespaces
      while (!stream.eol() && WHITESPACE_REGEX.test(peek())) {
        consume(peek());
      }

      // TODO: make regex highlight

      // double-dot .. range operator
      if (peek() === '.' && peek(1) === '.') {
        consume('..');
        return TOKENS.OPERATOR;
      }

      // := assignment
      if (peek() === ':' && peek(1) === '=') {
        consume(':=');
        return TOKENS.OPERATOR;
      }

      // !=
      if (peek() === '!' && peek(1) === '=') {
        consume('!=');
        return TOKENS.OPERATOR;
      }

      // >=
      if (peek() === '>' && peek(1) === '=') {
        consume('>=');
        return TOKENS.OPERATOR;
      }

      // <=
      if (peek() === '<' && peek(1) === '=') {
        consume('<=');
        return TOKENS.OPERATOR;
      }

      // ** descendant wildcard
      if (peek() === '*' && peek(1) === '*') {
        consume('**');
        return TOKENS.OPERATOR;
      }

      // ~> chain function
      if (peek() === '~' && peek(1) === '>') {
        consume('~>');
        return TOKENS.OPERATOR;
      }

      // test for single char operators
      if (OPERATORS.includes(peek())) {
        consume(peek());
        return TOKENS.OPERATOR;
      }

      // test for string literals
      if (peek() === '"' || peek() === "'") {
        const quoteType = peek();
        consume(quoteType);

        while (!stream.eol()) {
          const char = peek();

          if (char === quoteType) {
            consume(quoteType);
            return TOKENS.STRING;
          }

          consume(char);
        }

        return `${TOKENS.STRING} ${TOKENS.ERROR}`;
      }

      // test for numbers
      if (JSONATA_NUMBER_REGEX.test(peek())) {
        let number = peek();
        consume(number);

        while (!stream.eol() && JSONATA_NUMBER_REGEX.test(peek())) {
          number += peek();
          consume(peek());
        }

        number = parseFloat(number);
        if (!isNaN(number) && isFinite(number)) {
          return TOKENS.NUMBER;
        } else {
          return `${TOKENS.NUMBER} ${TOKENS.ERROR}`;
        }
      }

      // test for quoted names
      if (peek() === '`') {
        consume(peek());

        while (!stream.eol()) {
          if (peek() === '`') {
            consume(peek());
            return TOKENS.STRING;
          }

          consume(peek());
        }

        return `${TOKENS.STRING} ${TOKENS.ERROR}`;
      }

      // test for built-in variable (root of the input JSON)
      if (peek() === '$' && peek(1) === '$') {
        consume('$$');
        return TOKENS.BUILTIN;
      }

      // variable reference, built-in methods, etc...
      if (peek() === '$') {
        consume(peek());

        let name = '';
        while (!stream.eol() && JSONATA_VARIABLE_REGEX.test(peek())) {
          name += peek();
          consume(peek());
        }

        // '$'
        if (!name) {
          return TOKENS.BUILTIN;
        }

        // $sum
        if (BUILTIN_METHODS.includes(name)) {
          return TOKENS.BUILTIN;
        }

        return TOKENS.VARIABLE;
      }

      // some unknown names, could be that some kind of operator, i.e. "and"
      // also, it could just a JSONata attributes
      if (ALPHA_REGEX.test(peek())) {
        let name = peek();
        consume(name);

        while (!stream.eol() && ALPHA_REGEX.test(peek())) {
          name += peek();
          consume(peek());
        }

        if (OPERATORS.includes(name)) {
          return TOKENS.OPERATOR;
        }

        if (KEYWORDS.includes(name)) {
          return TOKENS.KEYWORD;
        }

        return TOKENS.ATTRIBUTE;
      }

      // We didn't recognize the character, so it's definitely error
      consume(peek());
      return `${TOKENS.KEYWORD} ${TOKENS.ERROR}`;
    }
  }
});
