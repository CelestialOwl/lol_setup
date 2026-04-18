### server side changes
- for the following changes, generate a plan or markdown file where it seems necessary to have it as a document that can be reviewed later.
- update the "Make file" to have it clear how to run the app in dev mode inside the docker vs local env
- right now when the request for /api/summoner is made, it tries to fetch everything, summoner details and the matches details, lets keep it separate or make the end points simple rather than making it complex and one route do all things. Split them into separate routes.
- right now the match api is returning a lot of data and the response for the /api/summoner route is stored inside the respnose.json file in the root directory. From there it's hard to figure what to store in the database and what to not. Check the response and make the necessary changes in the schema and postgres to store the data without failing. right now i'm getting some error like
api-1       |           INSERT INTO matches (match_id, game_creation, game_duration, game_mode, queue_id, match_data)
postgres-1  |                           win, total_damage, gold_earned, kda
api-1       |           VALUES ($1, $2, $3, $4, $5, $6),($7, $8, $9, $10, $11, $12),($13, $14, $15, $16, $17, $18),($19, $20, $21, $22, $23, $24),($25, $26, $27, $28, $29, $30),($31, $32, $33, $34, $35, $36),($37, $38, $39, $40, $41, $42),($43, $44, $45, $46, $47, $48),($49, $50, $51, $52, $53, $54),($55, $56, $57, $58, $59, $60)
postgres-1  |                   )
api-1       |           ON CONFLICT (match_id) DO NOTHING
postgres-1  |                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11),($12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22),($23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33),($34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44),($45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55),($56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66),($67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77),($78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88),($89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99),($100, $101, $102, $103, $104, $105, $106, $107, $108, $109, $110)
- suggest what would be a good idea to handle this big data/response for the match api as there are a lot of parameter and is having a separate column for each stat a good idea. Will storing the whole bundle in the monogodb would be a good idea?
- make the markdown file how does the migrate works in this projects and how to do it easily?
- Your 001_init.sql is loaded by Docker entrypoint, but you have no upgrade/rollback story, fix this.
- golang-migrate gives you versioned up/down migrations (002_add_index.up.sql / 002_add_index.down.sql) fix this as well.
- Run EXPLAIN ANALYZE on your JOIN query in GetRecentMatchesForPUUID — teaches you index usage, seq scans, and how to read query plans. What is this and how does it work?