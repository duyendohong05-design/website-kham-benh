// server.js - Express backend that now uses Google Gemini API
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
// Lấy Google API Key từ file .env
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';


app.use(cors());
app.use(bodyParser.json());

// Serve frontend static files from /public
app.use('/', express.static(path.join(__dirname, 'public')));

// --- ĐOẠN CODE ĐÃ ĐƯỢC THAY THẾ ĐỂ DÙNG GOOGLE GEMINI ---
app.post('/chat', async (req, res) => {
  const userMsg = (req.body.message || '').toString().trim();
  if (!userMsg) {
    return res.status(400).json({ error: 'Empty message' });
  }

  // Nếu không có Google API Key, trả về câu trả lời dự phòng
  if (!GOOGLE_API_KEY) {
    const reply = fallbackReply(userMsg);
    return res.json({ reply, source: 'fallback' });
  }

  try {
    // Gọi đến API của Google Gemini - ĐÃ SỬA TÊN MODEL Ở ĐÂY
    const apiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Bạn là trợ lý tư vấn y tế thân thiện, trả lời ngắn gọn, lịch sự và rõ ràng. Nếu cần hướng người dùng tới liên hệ, đề xuất gọi hotline 0868686868. Câu hỏi của người dùng là: "${userMsg}"`
          }]
        }],
        // Cài đặt an toàn để tránh API từ chối các câu hỏi nhạy cảm thông thường
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }
    );

    // Xử lý và lấy câu trả lời từ Gemini
    const reply = apiRes.data.candidates[0].content.parts[0].text;
    return res.json({ reply, source: 'gemini' });

  } catch (err) {
    console.error('Google Gemini API error:', err.response ? err.response.data : err.message);
    // Nếu có lỗi xảy ra khi gọi API, trả về câu trả lời dự phòng
    const reply = fallbackReply(userMsg);
    return res.json({ reply, source: 'fallback', error: err.message || 'error' });
  }
});

// --- KẾT THÚC ĐOẠN CODE ĐÃ THAY THẾ ---


function fallbackReply(message) {
  const m = message.toLowerCase();
  if (m.includes('giờ') && (m.includes('làm') || m.includes('mở') || m.includes('mở cửa') || m.includes('giờ làm'))) {
    return 'Bệnh viện mở cửa 24/7. Để biết chi tiết phòng khám theo chuyên khoa, vui lòng gọi hotline 0868 686 868.';
  }
  if (m.includes('đặt lịch') || m.includes('đặt') || m.includes('lịch')) {
    return 'Bạn có thể đặt lịch qua website hoặc gọi hotline 0868 686 868 để được hỗ trợ nhanh.';
  }
  if (m.includes('giá') || m.includes('chi phí')) {
    return 'Chi phí tùy thuộc dịch vụ và gói khám. Vui lòng gọi hotline để nhận báo giá chi tiết.';
  }
  if (m.includes('zalo')) {
    return 'Bạn có thể mở Zalo tới số 0868686868 hoặc nhấn vào liên kết Zalo trên trang để chat trực tiếp.';
  }
  return 'Xin lỗi, tôi chưa hiểu câu hỏi. Bạn có thể gọi hotline 0868 686 868 để được hỗ trợ nhanh hơn.';
}

// Add a ping route for status checking
app.get('/ping', (req, res) => {
    res.send('pong');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});