// Vercel serverless function as API proxy
export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path || '';
  
  // 构建目标URL
  const targetUrl = `http://34.130.185.125:3000/api/${apiPath}`;
  
  try {
    // 构建请求选项
    const requestOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // 如果有请求体，添加它
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      requestOptions.body = JSON.stringify(req.body);
    }

    console.log(`🔄 Proxying ${req.method} ${targetUrl}`);
    
    // 发送请求到后端
    const response = await fetch(targetUrl + (req.url.includes('?') ? '&' + req.url.split('?')[1] : ''), requestOptions);
    
    // 获取响应数据
    const data = await response.text();
    
    // 设置响应状态和头
    res.status(response.status);
    
    // 尝试解析JSON，如果失败就返回原始文本
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch {
      res.send(data);
    }
    
  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy request failed',
      message: error.message 
    });
  }
}
