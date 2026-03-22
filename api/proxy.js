export default async function handler(req, res) {
  const BASE_URL =
    "https://script.google.com/macros/s/AKfycbwT85CEvDby69zUFFZ6YHCkyObPwRWZm4RJ_Bj0T151wuG13AMCgL-UOf6m4lrn2lJF/exec";

  try {
    const { action, ...data } = req.method === "POST" ? req.body : req.query;

    const params = new URLSearchParams({ action, ...data });
    const url = `${BASE_URL}?${params.toString()}`;

    const response = await fetch(url);
    const text = await response.text();

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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
