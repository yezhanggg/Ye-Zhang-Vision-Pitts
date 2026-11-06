#!/bin/zsh -l
# Reopens the Claude Code conversation "unify-project-checks-policy-lab" (session fd1245d5-7295-46f7-b55d-9f1eb164a569).
cd '/Users/ye/Documents/Ye-Zhang-Vision-Pitts' || exit 1
CLAUDE=$(command -v claude || echo '/Users/ye/.local/bin/claude')
exec "$CLAUDE" --resume fd1245d5-7295-46f7-b55d-9f1eb164a569
