const joi = require('joi');
const { randNumberStr } = require('@dwing/common');
const Sendcloud = require('sendcloud');

const redis = require('.@lib/redis').db(1);
// const { publishMessage } = require('.@lib/sms');
// const { smsOptions } = require('.@config');
const { joinParams, needSign, schemas } = require('.@lib/defaults');
const { EMAIL_EXPIRES, EMAIL_LIMIT } = require('.@config/expires');
const { LIMITATION_EMAIL_CODE } = require('.@config/errors');
const { apiUser, apiKey, from, name, apiUserBatch } = require('.@config/sendcloud');

const check = [
  {
    method: 'post',
    path: '/sendcode',
    validate: {
      type: 'form',
      body: joinParams({
        email: joi.string().email().max(32).required().description('邮箱号'),
        guid: joi.string().max(64).required().description('设备唯一识别码,如IMEI')
      })
    },
    handler: [
      needSign,
      async (ctx) => {
        const guid = ctx.request.body.guid;
        const email = ctx.request.body.email;
        let code = await redis.get(`emailcode:${guid}`);
        // 禁止重复发送
        if (code !== null) {
          ctx.status = 201;
          ctx.body = { status: 1, code: LIMITATION_EMAIL_CODE, data: { result: 0 } };
          return;
        }
        code = randNumberStr(4);

        const tasks = [];
        // 设置邮件发送间隔
        tasks.push(redis.setex(`emailcode:${guid}`, EMAIL_LIMIT, code));
        // 设置邮件验证码
        tasks.push(redis.setex(`emailcode:${email}`, EMAIL_EXPIRES, code));
        // 发送邮件
        // tasks.push(publishMessage(mobile, smsOptions.template, {
        //   code,
        //   product: ctx.app.name
        // }));

        const sc = new Sendcloud(apiUser, apiKey, from, name, apiUserBatch);
        // const sendRes = await sc.send(email, '大翼邮件验证码', `您的验证码是:${code}`);
        tasks.push(sc.send(email, `大翼航空您的验证码是:${code}`, `您的验证码是:${code}`));
        // 等待所有任务异步完成
        await Promise.all(tasks);
        ctx.status = 200;
        ctx.body = { status: 1, data: { result: 1 } };
      }
    ],
    swagger: {
      tags: ['email'],
      summary: '发送邮件验证码',
      description: '频率限制:间隔90s.',
      responses: {
        200: {
          description: '发送成功',
          schema: schemas.success
        },
        201: {
          description: '发送失败',
          schema: schemas.fail(LIMITATION_EMAIL_CODE)
        }
      }
    }
  }
];

module.exports = check;

