export default async function handler(req, res) {
  const BASE_URL =
    "https://script.google.com/macros/s/AKfycbzsFqxLMTYWv9b_rTql5h3o0hyFxNBrUJYBIa_16KfQVNCY_bwBADQMXzmc35siSZs6/exec";

  try {
    const { action, ...data } = req.body;

    console.log("REQUEST:", action, data);

    const params = new URLSearchParams({ action, ...data });
    const url = `${BASE_URL}?${params.toString()}`;

    console.log("FINAL URL:", url);

    const response = await fetch(url);
    const text = await response.text();

    console.log("RAW RESPONSE:", text);

    let json;

    try {
      json = JSON.parse(text);
    } catch {
      return res.status(500).json({
        success: false,
        message: "Invalid response from backend",
        raw: text,
      });
    }

    res.status(200).json(json);
  } catch (error) {
    console.error("PROXY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
