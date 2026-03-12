export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { estado, especialidade, quantidade, keyword, offset } = req.body;
  const keywordPart = keyword ? ` com foco em ${keyword}` : '';
  const offsetPart = offset > 0 ? ` Retorne outras ${quantidade} diferentes das primeiras ${offset}.` : '';
  const prompt = `Você é especialista em agronegócio brasileiro. Liste ${quantidade} consultorias ou consultores de ${especialidade} no estado de ${estado}${keywordPart}.${offsetPart} Para cada um retorne JSON com: nome, responsavel, estado, telefone, email, instagram, linkedin, site, descricao. Responda SOMENTE com array JSON válido, sem markdown.`;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(200).json({ error: 'Chave API não configurada' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(200).json({ error: JSON.stringify(data) });

    let rawText = '';
    for (const block of data.content) {
      if (block.type === 'text') rawText += block.text;
    }
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(200).json({ results: [] });
    return res.status(200).json({ results: JSON.parse(jsonMatch[0]) });

  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
