import config from 'eslint-config-coderiety';

export default [...config, { ignores: ['docs/dist.js', 'types/index.d.ts'] }];
