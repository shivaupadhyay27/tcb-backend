import { Request, Response } from 'express';

export const handleAffiliateRedirect = async (req: Request, res: Response) => {
  const { slug } = req.params;

  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    return res.status(400).json({
      status: 'error',
      message: 'Affiliate slug is required',
    });
  }

  // 🔥 later you can fetch from DB and resolve the targetUrl by slug
  const targetUrl = 'https://example.com';

  try {
    console.log(
      JSON.stringify({
        type: 'AFFILIATE_CLICK',
        slug,
        referrer: req.headers.referer || 'direct',
      }),
    );

    return res.redirect(302, targetUrl);
  } catch (error) {
    console.error('Affiliate redirect failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Unable to redirect affiliate link',
    });
  }
};
