# Blog — Domain Glossary

Shared vocabulary for the owner's personal work journal. This is a glossary only — no implementation details.

## Language

**Blog**: the owner's personal work journal. Posts are short (typically two or three lines) quick notes captured while working. It is not a multi-author content platform or a publication.
_Avoid_: Platform, publication, site

**Post**: a single journal entry. Has an optional title, an HTML body, an optional image, and an optional video. Identified by a numeric id and has a single timestamp.
_Avoid_: Article, entry

**Post Body**: the content of a Post. Authored as HTML in a plain textarea and stored as HTML.
_Avoid_: Content

**Feed**: the home page list of Posts, newest first, loaded incrementally and filterable by date.
_Avoid_: Timeline, homepage list

**Archive Filter**: narrowing the Feed by year / month / day.

**Video**: a media artifact attached to a Post. It has a lifecycle: uploaded/queued → processing → processed, or failed. Playback uses HLS.
_Avoid_: Media, movie, clip

**Admin**: the single owner/author of the Blog. Authenticated by a cookie session derived from environment-variable credentials. There is exactly one admin.
_Avoid_: User, author, account

**Quick Capture**: the primary workflow — while working, open the editor and jot a short note (title optional, body required).

**Search**: full-text lookup over Post bodies and titles, performed by the application at request time over existing columns.
_Avoid_: Full-text index, fuzzy search

**Tag**: a possible way to group Posts. Not used: posts are grouped only by Archive Filter and Search. Blocked by the no-schema-changes constraint (see ADR-0001).
_Avoid_: Label, topic, category