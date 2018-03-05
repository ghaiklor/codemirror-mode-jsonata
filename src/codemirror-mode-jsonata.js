CodeMirror.defineMode('jsonata', function () {
  const OPERATORS = ['.', '[', ']', '{', '}', '(', ')', ',', '@', '#', ';', ':', '?', '+', '-', '*', '/', '%', '|', '=', '<', '>', '^', '**', '..', ':=', '!=', '<=', '>=', '~>', 'and', 'or', 'in', '&', '!', '~'];
  const RESERVED_KEYWORDS = ['true', 'false', 'null'];

  return {
    startState: function () {
      return {
        currentChar: null
      }
    },

    token: function (stream, state) {
      // EOF
      if (stream.eol()) {
        return null;
      }

      // skip whitespace
      stream.eatSpace();

      // store current char that we are going to analyze
      state.currentChar = stream.next();

      // test for regex
      if (state.currentChar === '/') {
        // TODO:
        stream.next();

        // the prefix '/' will have been previously scanned. Find the end of the regex.
        // search for closing '/' ignoring any that are escaped, or within brackets
        let start = position;
        let depth = 0;
        let pattern;
        let flags;
        while (position < length) {
          const currentChar = path.charAt(position);
          if (currentChar === '/' && path.charAt(position - 1) !== '\\' && depth === 0) {
            // end of regex found
            pattern = path.substring(start, position);
            if (pattern === '') {
              throw {
                code: "S0301",
                stack: (new Error()).stack,
                position: position
              };
            }
            position++;
            currentChar = path.charAt(position);
            // flags
            start = position;
            while (currentChar === 'i' || currentChar === 'm') {
              position++;
              currentChar = path.charAt(position);
            }
            flags = path.substring(start, position) + 'g';
            return new RegExp(pattern, flags);
          }
          if ((currentChar === '(' || currentChar === '[' || currentChar === '{') && path.charAt(position - 1) !== '\\') {
            depth++;
          }
          if ((currentChar === ')' || currentChar === ']' || currentChar === '}') && path.charAt(position - 1) !== '\\') {
            depth--;
          }

          position++;
        }

        return 'regex error';
      }

      // double-dot .. range operator
      if (state.currentChar === '.' && stream.peek() === '.') {
        stream.next();
        stream.next();
        return 'operator';
      }

      // := assignment
      if (state.currentChar === ':' && stream.peek() === '=') {
        stream.next();
        stream.next();
        return 'operator';
      }

      // !=
      if (state.currentChar === '!' && stream.peek() === '=') {
        stream.next();
        stream.next();
        return 'operator';
      }

      // >=
      if (state.currentChar === '>' && stream.peek() === '=') {
        stream.next();
        stream.next();
        return 'operator';
      }

      // <=
      if (state.currentChar === '<' && stream.peek() === '=') {
        stream.next();
        stream.next();
        return 'operator';
      }

      // **  descendant wildcard
      if (state.currentChar === '*' && stream.peek() === '*') {
        stream.next();
        stream.next();
        return 'operator';
      }

      // ~>  chain function
      if (state.currentChar === '~' && stream.peek() === '>') {
        stream.next();
        stream.next();
        return 'operator';
      }

      // test for single char operators
      if (OPERATORS.includes(state.currentChar)) {
        stream.next();
        return 'operator';
      }

      // test for string literals
      if (state.currentChar === '"' || state.currentChar === "'") {
        let quoteType = state.currentChar;

        while (!stream.eol()) {
          state.currentChar = stream.next();

          if (state.currentChar === quoteType) {
            // Closing quote, so the string is valid
            stream.next();
            return 'string';
          }

          // Advancing the cursor until we see escape sequence or closing quote
          stream.next();
        }

        return 'string error';
      }

      // test for numbers
      const numregex = /^-?(0|([1-9][0-9]*))(\.[0-9]+)?([Ee][-+]?[0-9]+)?/;
      if (numregex.test(state.currentChar)) {
        let number = state.currentChar;
        state.currentChar = stream.next();

        while (numregex.test(state.currentChar)) {
          number += state.currentChar;
          state.currentChar = stream.next();
        }

        number = parseFloat(number);
        if (!isNaN(number) && isFinite(number)) {
          return 'number';
        } else {
          return 'number error';
        }
      }

      // test for quoted names (backticks)
      if (state.currentChar === '`') {
        const isValid = stream.eatWhile(/\w/);

        return isValid ? 'string' : 'string error';
      }

      // variable reference
      if (state.currentChar === '$') {
        stream.eatWhile(/[a-zA-Z0-9]/);

        return 'variable-2';
      }

      // Variable identifiers, operators, keywords, internal methods, etc...
      if (/[a-zA-Z]/.test(state.currentChar)) {
        // TODO
        let name = state.currentChar;
        state.currentChar = stream.next();

        while (/[a-zA-Z]/.test(state.currentChar)) {
          name += state.currentChar;
          state.currentChar = stream.next();
        }

        if (RESERVED_KEYWORDS.includes(name)) {
          return 'keyword';
        }

        return 'link';
      }
    }
  }
});
