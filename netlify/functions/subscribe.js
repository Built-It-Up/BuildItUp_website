exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    return { statusCode: 500, body: JSON.stringify({ error: "Newsletter signup is not configured yet." }) };
  }

  let email;
  try {
    email = JSON.parse(event.body || "{}").email;
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body." }) };
  }
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: "Email is required." }) };
  }

  const dc = apiKey.split("-")[1];
  if (!dc) {
    return { statusCode: 500, body: JSON.stringify({ error: "Newsletter signup is not configured correctly." }) };
  }

  const auth = Buffer.from(`anystring:${apiKey}`).toString("base64");

  try {
    const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ email_address: email, status: "subscribed" })
    });
    const result = await res.json();

    if (res.ok) {
      return { statusCode: 200, body: JSON.stringify({ message: "Thanks for subscribing!" }) };
    }
    if (result && result.title === "Member Exists") {
      return { statusCode: 200, body: JSON.stringify({ message: "You're already on the list!" }) };
    }
    return { statusCode: res.status, body: JSON.stringify({ error: (result && result.detail) || "Something went wrong. Please try again." }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Something went wrong. Please try again." }) };
  }
};
