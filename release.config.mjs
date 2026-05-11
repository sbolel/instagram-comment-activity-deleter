export default {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: [
          {
            path: 'dist/instagram-comment-activity-deleter.console.js',
            label: 'Console script',
          },
          {
            path: 'dist/instagram-comment-activity-deleter.user.js',
            label: 'Userscript',
          },
          {
            path: 'apps/chrome-extension/dist/*',
            label: 'Chrome extension unpacked file',
          },
        ],
      },
    ],
  ],
}
