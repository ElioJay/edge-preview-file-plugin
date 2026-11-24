// Loaded before vendor/prism.min.js. Left alone, Prism highlights every
// code[class*="language-"] in the page right after it loads, which reached
// fenced code blocks in rendered Markdown or not depending on timing. All
// highlighting here goes through Prism.highlight() explicitly.
window.Prism = { manual: true };
