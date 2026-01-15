export const createEsbuilderHtmlTemplate = (scriptContent: string, head?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  ${head || `<script type="module">${scriptContent}</script>`}
</head>
<body></body>
</html>
`.trim();
