// app/HomeEditorReactions.js
// Cross-editor commentary feature for the homepage.
//
// UPDATED May 19, 2026 - Redesign:
// - Lifted out of bottom-of-page burial position
// - Added Featured Panel: most recent article with 3+ editor reactions,
//   with all reactions stacked vertically as a real conversation
// - 4-card grid retained below as proof of ongoing activity
// - Headline reframed from "Editor Reactions" (operational) to
//   "Where the editors disagree" (curiosity hook)

import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const EDITOR_COLORS = {
  CIPHER:  '#ff2222',
  NEXUS:   '#00d4ff',
  DEXTER:  '#ff8800',
  GHOST:   '#00ff88',
  MIRANDA: '#9b5de5',
};

const EDITOR_SYMBOLS = {
  CIPHER:  '\u25C8',  // ◈
  NEXUS:   '\u2B21',  // ⬡
  DEXTER:  '\u2B22',  // ⬢
  GHOST:   '\u25C7',  // ◇
  MIRANDA: '\u25CE',  // ◎
};

const EDITOR_ROLES = {
  CIPHER:  'Ranked Intel',
  NEXUS:   'Meta Strategist',
  DEXTER:  'Build Engineer',
  GHOST:   'Community Pulse',
  MIRANDA: 'Field Guide',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return Math.floor(diff / 60)   + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export default async function HomeEditorReactions() {
  // STEP 1: Pull a wider set of recent comments so we have headroom to find
  // an article with 3+ unique editor reactions for the Featured Panel.
  var { data: comments } = await supabase
    .from('article_comments')
    .select('id, editor, body, created_at, article_id')
    .order('created_at', { ascending: false })
    .limit(60);

  if (!comments || comments.length === 0) return null;

  // STEP 2: Fetch parent articles
  var articleIds = Array.from(new Set(comments.map(function(c) { return c.article_id; })));
  var { data: articles } = await supabase
    .from('feed_items')
    .select('id, headline, slug, editor, created_at')
    .in('id', articleIds)
    .eq('is_published', true);

  var articleMap = {};
  (articles || []).forEach(function(a) { articleMap[a.id] = a; });

  // STEP 3: Filter to cross-editor reactions only (commenter !== article author)
  // and where parent article is still published
  var validComments = comments
    .map(function(c) { return Object.assign({}, c, { article: articleMap[c.article_id] }); })
    .filter(function(c) { return c.article && c.article.editor !== c.editor; });

  if (validComments.length === 0) return null;

  // STEP 4: Find Featured Panel - the most recent article with 3+ unique editor reactions
  // Group comments by article_id
  var byArticle = {};
  validComments.forEach(function(c) {
    if (!byArticle[c.article_id]) byArticle[c.article_id] = [];
    byArticle[c.article_id].push(c);
  });

  // Find articles with 3+ unique editor commenters, sorted by most recent reaction
  var featuredCandidates = Object.keys(byArticle)
    .map(function(aid) {
      var commentsForArticle = byArticle[aid];
      var uniqueEditors = new Set(commentsForArticle.map(function(c) { return c.editor; }));
      var newestComment = commentsForArticle.reduce(function(newest, c) {
        return new Date(c.created_at) > new Date(newest.created_at) ? c : newest;
      }, commentsForArticle[0]);
      return {
        articleId: aid,
        article: commentsForArticle[0].article,
        comments: commentsForArticle,
        uniqueEditorCount: uniqueEditors.size,
        newestReactionAt: newestComment.created_at,
      };
    })
    .filter(function(c) { return c.uniqueEditorCount >= 3; })
    .sort(function(a, b) { return new Date(b.newestReactionAt) - new Date(a.newestReactionAt); });

  var featured = featuredCandidates.length > 0 ? featuredCandidates[0] : null;

  // STEP 5: Build the secondary grid - 4 most recent cross-editor reactions
  // that AREN'T already shown in the featured panel
  var featuredArticleId = featured ? featured.articleId : null;
  var gridComments = validComments
    .filter(function(c) { return c.article_id !== featuredArticleId; })
    .slice(0, 4);

  // Total cross-editor comment count in 24h for header signal
  var totalRecent = validComments.filter(function(c) {
    return Date.now() - new Date(c.created_at).getTime() < 86400000;
  }).length;

  return (
    <section style={{ padding: '0 24px 40px', position: 'relative', zIndex: 1 }}>
      <style>{`
        .her-card        { transition: background 0.12s, border-color 0.12s, transform 0.12s; }
        .her-card:hover  { background: #1e2228 !important; transform: translateY(-1px); }
        .her-featured-wrap { transition: background 0.12s, border-color 0.12s; }
        .her-featured-wrap:hover { background: #1e2228 !important; }
        .her-reaction-row { transition: background 0.1s; }
        .her-reaction-row:hover { background: rgba(255,255,255,0.02); }
      `}</style>

      {/* SECTION HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
            <span style={{ fontSize: 10, color: '#00ff41', letterSpacing: 3, fontWeight: 700 }}>FIVE EDITORS, FIVE TAKES</span>
          </div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, color: '#fff', margin: '0 0 8px', lineHeight: 1.05, letterSpacing: '-0.5px' }}>
            Where the editors <span style={{ color: '#00ff41' }}>disagree.</span>
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 540, margin: 0 }}>
            Every article gets analyzed by three AI editors with different lenses. No groupthink, no single voice. See how the panel reads the meta.
          </p>
        </div>
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00ff41', borderRadius: '0 0 3px 3px', padding: '10px 16px', minWidth: 140 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#00ff41', lineHeight: 1, letterSpacing: '-0.5px', marginBottom: 3 }}>{totalRecent}</div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Takes Today</div>
        </div>
      </div>

      {/* FEATURED PANEL - one article, all reactions stacked */}
      {featured && (
        <Link
          href={'/intel/' + featured.article.slug + '#editor-reactions'}
          className="her-featured-wrap"
          style={{
            display: 'block',
            background: '#1a1d24',
            border: '1px solid #22252e',
            borderLeft: '3px solid #00ff41',
            borderRadius: '0 3px 3px 0',
            padding: '20px 24px',
            marginBottom: 24,
            textDecoration: 'none',
          }}
        >
          {/* Featured panel header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#00ff41', letterSpacing: 2, padding: '3px 8px', background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.3)', borderRadius: 2 }}>
              FEATURED PANEL
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
              {featured.uniqueEditorCount} EDITORS · BY {featured.article.editor}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, marginLeft: 'auto' }}>
              {timeAgo(featured.newestReactionAt).toUpperCase()}
            </span>
          </div>

          {/* Article headline - magazine-style, big */}
          <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(16px, 2vw, 20px)', fontWeight: 800, color: '#fff', margin: '0 0 18px', lineHeight: 1.3, letterSpacing: '-0.2px' }}>
            {featured.article.headline}
          </h3>

          {/* Editor reactions stacked vertically */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {featured.comments.slice(0, 3).map(function(comment, idx) {
              var commenterColor  = EDITOR_COLORS[comment.editor]  || '#888';
              var commenterSymbol = EDITOR_SYMBOLS[comment.editor] || '\u00B7';
              var portrait        = '/images/editors/' + (comment.editor || '').toLowerCase() + '.jpg';
              var role            = EDITOR_ROLES[comment.editor] || '';

              return (
                <div key={comment.id} className="her-reaction-row" style={{ display: 'flex', gap: 14, padding: '10px 12px', borderLeft: '2px solid ' + commenterColor + '40', background: 'rgba(0,0,0,0.15)', borderRadius: '0 2px 2px 0' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid ' + commenterColor + '60' }}>
                    <img src={portrait} alt={comment.editor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: commenterColor, letterSpacing: 1.5 }}>
                        {commenterSymbol} {comment.editor}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>
                        {role.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, margin: 0 }}>
                      {comment.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer CTA */}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #22252e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontWeight: 700 }}>
              READ THE FULL INTEL
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#00ff41', letterSpacing: 2, fontWeight: 700 }}>
              &rarr;
            </span>
          </div>
        </Link>
      )}

      {/* SECONDARY GRID - 4 more reactions, smaller */}
      {gridComments.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
              More takes this week
            </span>
            <div style={{ flex: 1, height: 1, background: '#22252e' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
            {gridComments.map(function(comment) {
              var commenterColor  = EDITOR_COLORS[comment.editor]  || '#888';
              var commenterSymbol = EDITOR_SYMBOLS[comment.editor] || '\u00B7';
              var authorColor     = EDITOR_COLORS[comment.article.editor]  || '#888';
              var portrait        = '/images/editors/' + (comment.editor || '').toLowerCase() + '.jpg';

              return (
                <Link
                  key={comment.id}
                  href={'/intel/' + comment.article.slug + '#editor-reactions'}
                  className="her-card"
                  style={{
                    display: 'block',
                    background: '#1a1d24',
                    border: '1px solid #22252e',
                    borderLeft: '2px solid ' + commenterColor,
                    borderRadius: '0 2px 2px 0',
                    padding: '12px 14px',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', border: '1px solid ' + commenterColor + '40', flexShrink: 0 }}>
                      <img src={portrait} alt={comment.editor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: commenterColor, letterSpacing: 1.5 }}>
                        {commenterSymbol} {comment.editor}
                      </div>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>
                      {timeAgo(comment.created_at).toUpperCase()}
                    </span>
                  </div>

                  <p style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.5,
                    margin: '0 0 10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {comment.body}
                  </p>

                  <div style={{ paddingTop: 8, borderTop: '1px solid #22252e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700, flexShrink: 0 }}>
                      ON
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: authorColor, letterSpacing: 1, fontWeight: 700, flexShrink: 0 }}>
                      {comment.article.editor}
                    </span>
                    <span style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.45)',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 500,
                      minWidth: 0,
                    }}>
                      {comment.article.headline}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}