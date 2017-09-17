const _ = require('lodash');
const moment = require('moment');
const express = require('express');
const superagent = require('superagent');
const fs = require('fs');
const util = require('util');
var CronJob = require('cron').CronJob;
const app = express();

let CurrentPrice = {
  korbit: 0,
  coinone: 0,
  bithumb: 0,
}

var bitcoinPriceLogger = new CronJob({
  cronTime: '*/2 * * * * *',
  onTick: () => {
    const logFilePath = '/var/log/bitcoin/bitcoin-price.log';
    const isLogfileExist = fs.existsSync(logFilePath);

    Promise.all([setKobitPrice(), setCoinonePrice(), setBithumbPrice()])
    .then((prices) => {
      const priceObject = {
        korbit: prices[0],
        coinone: prices[1],
        bithumb: prices[2],
        date: moment().format('MM/DD hh:mm:ss'),
      }

      CurrentPrice = _.assign({}, CurrentPrice, priceObject);

      return priceObject;
    })
    .then((price) => {
      if (isLogfileExist) {
        fs.appendFile(logFilePath, JSON.stringify(price)+"\n", (err) => {
          if (err) throw err;
        });
        return;
      }

      fs.createWriteStream(logFilePath, { flags: 'w', autoClose: true, mode: 0o755 }).write(JSON.stringify(price)+"\n");
    })
    .catch(err => {
      console.log(err);
    })
  },
  start: false,
  timeZone: 'Asia/Seoul',
});

bitcoinPriceLogger.start();

let tempPrice = {
  korbit: 0,
  coinone: 0,
  bithumb: 0,
}

const Request = (url) => {
  return new Promise((resolve, reject) => {
    superagent
      .get(url)
      .set('Accept', 'application/json')
      .end((error, res) => {
      error ? reject(error) : resolve(JSON.parse(res.text));
      });
  });
}

const setKobitPrice = () => {
  return Request('https://api.korbit.co.kr/v1/ticker/detailed')
    .then(res => {
      return res.last;
    })
    .catch(err => {
      return 'error';
    });
}

const setCoinonePrice = () => {
  return Request('https://api.coinone.co.kr/ticker')
    .then(res => {
      return res.last;
    })
    .catch(err => {
      return 'error';
    });
}

const setBithumbPrice = () => {
  return Request('https://api.bithumb.com/public/ticker/BTC')
    .then(res => {
      return res.data.buy_price;
    })
    .catch(err => {
      return 'error';
    });
}

app.get('/get-price', (req, res) => {
  // Promise.all([setKobitPrice(), setCoinonePrice(), setBithumbPrice()])
  // .then((prices) => {
  //   const priceObject = {
  //     korbit: prices[0],
  //     coinone: prices[1],
  //     bithumb: prices[2],
  //     date: moment().format('MM/DD hh:mm:ss'),
  //   }
  //
  //   tempPrice = _.assign({}, tempPrice, priceObject);
  //
  //   return priceObject;
  // })
  // .then((price) => res.json(price))
  // .catch(() => res.json(_.assign({}, tempPrice, {
  //   date: moment().format('MM/DD h:mm:ss'),
  // })))
  res.json(CurrentPrice);
});

app.listen(3000, function () {
  console.log('app listening on port 3000!');
});
