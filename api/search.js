export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { estado, especialidade, quantidade, keyword, offset } = req.body;
  const keywordPart = keyword ? ` com foco em ${keyword}` : '';
  const offsetPart = offset > 0 ? ` Não repita as ${offset} primeiras que já foram retornadas. Retorne outras ${quantidade} diferentes.` : '';

  const prompt = `Você é um especialista em mapeamento de mercado do agronegócio brasileiro. Use web search para encontrar consultorias e consultores REAIS.

Busque na web e retorne EXATAMENTE ${quantidade} consultorias ou consultores especializados em ${especialidade} no estado de ${estado}${keywordPart}.${offsetPart}

Para cada resultado encontrado na web, extraia:
- nome: nome real da empresa ou consultório
- responsavel: nome do responsável/sócio principal se encontrado publicamente, senão null
- estado: estado de atuação
- telefone: telefone ou WhatsApp encontrado publicamente, senão null
- email: email de contato encontrado publicamente, senão null
- instagram: @ do perfil Instagram se encontrado, senão null
- linkedin: URL do LinkedIn se encontrado, senão null
- site: URL do site se encontrado, senão null
- descricao: 1 frase sobre o foco de atuação com base no que encontrou na web

Responda SOMENTE com um array JSON válido. Zero texto fora do JSON. Zero markdown. Zero explicação.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    let rawText = '';
    for (const block of data.content) {
      if (block.type === 'text') rawText += block.text;
    }

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(200).json({ results: [] });

    const results = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ results });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
