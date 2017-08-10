const MarkdownIt = require('markdown-it');
const highlightPreset = require('markdown-it-highlightjs');

const md = new MarkdownIt({
  html: true
});

md.use(highlightPreset);

module.exports = function(source) {
  const done = this.async();
  const result = md.render(source);

  done(null, `module.exports = ${JSON.stringify(result)}`);
};
