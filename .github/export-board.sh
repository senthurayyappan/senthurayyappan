set -euo pipefail
# Writes the whole Co-design board (items, field values, goal progress, blockers) to $1.
gh api graphql --paginate -f o="$OWNER" -F n="$PROJECT" -f query='
query($o: String!, $n: Int!, $endCursor: String) { user(login: $o) { projectV2(number: $n) {
  items(first: 100, after: $endCursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      content { ... on Issue { title url state updatedAt closedAt body repository { nameWithOwner }
        parent { url } subIssuesSummary { total completed } issueDependenciesSummary { blockedBy } } }
      fieldValues(first: 20) { nodes {
        ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
        ... on ProjectV2ItemFieldDateValue { date field { ... on ProjectV2FieldCommon { name } } }
        ... on ProjectV2ItemFieldIterationValue { title startDate duration field { ... on ProjectV2FieldCommon { name } } }
      } } } } } } }' \
| jq -s --arg now "$(date -u +%FT%TZ)" '
  { exportedAt: $now,
    items: [ .[].data.user.projectV2.items.nodes[]
      | select(.content.url != null)
      | { title: .content.title, url: .content.url, repo: .content.repository.nameWithOwner,
          state: .content.state, updatedAt: .content.updatedAt, closedAt: .content.closedAt,
          parent: .content.parent.url, subIssues: .content.subIssuesSummary,
          openBlockers: .content.issueDependenciesSummary.blockedBy,
          body: (.content.body // "")[:2500],
          fields: ([.fieldValues.nodes[] | select(.field)
            | {(.field.name): (.name // .date // {iteration: .title, start: .startDate, days: .duration})}] | add) } ] }' > "$1"
