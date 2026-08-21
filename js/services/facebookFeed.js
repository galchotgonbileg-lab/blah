const DEFAULT_FIELDS = [
  'id',
  'message',
  'created_time',
  'permalink_url',
  'comments.limit(10){id,message,created_time}'
].join(',');

function keywordMatches(post, keywords) {
  if (keywords.length === 0) {
    return true;
  }

  const haystack = [
    post.message,
    ...(post.comments?.data ?? []).map((comment) => comment.message)
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function toFeedPost(post) {
  return {
    id: post.id,
    message: post.message || '',
    createdAt: post.created_time || null,
    permalinkUrl: post.permalink_url || null,
    comments: (post.comments?.data ?? []).map((comment) => ({
      id: comment.id,
      message: comment.message || '',
      createdAt: comment.created_time || null
    }))
  };
}

export async function fetchFacebookFeed({ sourceId, sourceType, limit = 30, keywords = [] }) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN?.trim();
  if (!accessToken || accessToken === 'your_facebook_access_token_here') {
    return {
      mode: 'not_configured',
      posts: [],
      message: 'FACEBOOK_ACCESS_TOKEN тохируулаагүй байна.'
    };
  }

  const version = process.env.FACEBOOK_GRAPH_VERSION || 'v25.0';
  const edge = sourceType === 'group' ? 'feed' : 'posts';
  const url = new URL(`https://graph.facebook.com/${version}/${sourceId}/${edge}`);
  url.searchParams.set('fields', DEFAULT_FIELDS);
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 50)));
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    return {
      mode: 'error',
      posts: [],
      error: data.error?.message || 'Facebook feed татахад алдаа гарлаа.'
    };
  }

  const posts = (data.data ?? [])
    .map(toFeedPost)
    .filter((post) => keywordMatches(post, keywords));

  return {
    mode: 'live',
    sourceId,
    sourceType,
    posts
  };
}
