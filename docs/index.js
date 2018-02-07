'use strict';

const Koa = require('koa');
const send = require('koa-send');
const path = require('path');
const { SwaggerAPI, ui } = require('koa-swagger-ui');
const { enabledModules, docOptions, docServerOptions } = require('.@config');
const html = require('./html');

const ENV = process.env.NODE_ENV || 'development';
const swaggerAPI = new SwaggerAPI();

enabledModules.forEach((mod) => {
  /* eslint global-require:0 */
  const routes = require(`../${mod}/route`);
  swaggerAPI.addJoiRouter(routes);
});

const swaggerDoc = swaggerAPI.generateSpec(docOptions);


const app = new Koa();
app.use(async (ctx, next) => {
  if (ENV === 'development') {
    ctx.set('Access-Control-Allow-Origin', '*');
  }

  await next();
  if (ctx.path.startsWith('/hooks.js')) {
    await send(ctx, 'hooks.js', Object.assign({ root: path.join(__dirname, 'js/') }, { maxage: 3600 * 1000 * 24 * 30 }));
  } else if (ctx.path.startsWith('/sha.js')) {
    await send(ctx, 'sha.js', Object.assign({ root: path.join(__dirname, 'js/') }, { maxage: 3600 * 1000 * 24 * 30 }));
  } else if (ctx.path.startsWith('/authcode.js')) {
    await send(ctx, 'authcode.js',
      Object.assign({ root: path.join(__dirname, '../../node_modules/@airx/authcode/dist/') },
        { maxage: 3600 * 1000 * 24 * 30 })
    );
  }
});
app.use(ui(swaggerDoc, { pathRoot: '/', UIHtml: html, skipPaths: ['/hooks.js', '/sha.js', '/authcode.js'] }));
app.listen(docServerOptions);
