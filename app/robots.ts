import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://quiz-master-two.vercel.app"

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/host/', '/play/', '/api/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
