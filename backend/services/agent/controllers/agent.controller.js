import fs from 'fs';
import { graph } from '../graph/supervisor.graph.js';
import { addMessage } from '../utils/memory.js';
import { getDownloadUrl, uploadToStorage } from '../utils/storage.js';
import axios from 'axios';

export const chat = async (req, res, next) => {
  try {
    const {
      prompt,
      conversationId,
      agent,
    } = req.body;

    console.log(req.body);
    console.log(req.file);

    await addMessage(conversationId, 'user', prompt);

    let attachments = [];

    if (req.file) {
      // Durable preview copy (blob URLs die on reload; this URL survives).
      const buffer = fs.readFileSync(req.file.path);
      const safeName = `preview-${Date.now()}-${String(req.file.originalname).replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      )}`;
      await uploadToStorage(buffer, safeName, req.file.mimetype);
      const url = await getDownloadUrl(safeName, 60 * 60 * 24 * 7);

      attachments = [
        {
          name: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          url,
        },
      ];
    }

    await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
      conversationId,
      role: 'user',
      content: prompt,
      attachments,
    });

    const result = await graph.invoke({
      prompt,
      conversationId,
      userId: req.headers['x-user-id'],
      agent,
      file: req.file,
    });

    console.log('after res', result);

    await addMessage(conversationId, 'assistant', result.response);
    await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
      conversationId,
      role: 'assistant',
      content: result.response,
      images: result.images,
      artifacts: result.artifacts || [],
    });

    return res.json({
      success: true,
      answer: result.response,
      images: result.images,
      artifacts: result.artifacts || [],
      attachments,
    });
  } catch (error) {
    next(error);
  }
};
