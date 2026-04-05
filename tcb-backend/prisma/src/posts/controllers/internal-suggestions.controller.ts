import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export async function handleGetInternalSuggestions(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;

    // Current post ki categories lo
    const currentPost = await prisma.post.findUnique({
      where: { id },
      include: { postCategories: true },
    });

    if (!currentPost || currentPost.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Post not found' });
    }

    const categoryIds = currentPost.postCategories.map((pc) => pc.categoryId);
    if (categoryIds.length === 0) return res.json({ suggestions: [] });

    // Score calculate karo — N+1 fix
    // Kyu: Pehle sirf IDs aur scores fetch karo
    // Kya hoga: Sirf 2 DB queries hongi — N queries nahi
    const relatedPostCategories = await prisma.postCategory.findMany({
      where: {
        categoryId: { in: categoryIds },
        postId: { not: id },
        post: { status: 'PUBLISHED' },
      },
      select: { postId: true },
    });

    // Score map banao
    const scoreMap = new Map<string, number>();
    for (const pc of relatedPostCategories) {
      scoreMap.set(pc.postId, (scoreMap.get(pc.postId) || 0) + 1);
    }

    // Top IDs score se sort karo
    const topIds = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([postId]) => postId);

    if (topIds.length === 0) return res.json({ suggestions: [] });

    // Ek hi query mein sab fetch karo — N+1 fix
    // Kyu: Pehle alag alag queries thi — ab ek mein sab
    const posts = await prisma.post.findMany({
      where: { id: { in: topIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        ogImage: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { name: true, slug: true } },
        postCategories: {
          select: { category: { select: { name: true, slug: true } } },
        },
      },
    });

    // Score order maintain karo
    const postMap = new Map(posts.map((p) => [p.id, p]));
    const suggestions = topIds
      .map((postId) => {
        const post = postMap.get(postId);
        if (!post) return null;
        return {
          ...post,
          score: scoreMap.get(postId) || 0,
          categories: post.postCategories.map((pc) => pc.category),
          postCategories: undefined,
        };
      })
      .filter(Boolean);

    return res.json({ suggestions });
  } catch (error) {
    console.error('Internal suggestions error:', error);
    return res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
}
