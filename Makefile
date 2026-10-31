# Short names for the commands we type most. Each one just runs the npm
# script (or Stripe CLI command) written next to it, so `make dev` and
# `npm run dev` do the same thing.
#   make dev      API + Vite + Stripe listener (open http://localhost:5173)
#   make stripe   pass Stripe webhook events on to the running API
#   make build    build the React app into client/dist
#   make start    run the production server (after make build)
#   make lint     oxlint on the client
#   make test     the server's and the client's tests (Vitest)

# These are command names, not files that make should look for
.PHONY: help dev stripe build start lint test

# `make` on its own prints the list above
help:
	@sed -n 's/^#   make/make/p' Makefile

# `npm run dev` without Stripe; --stripe tells dev.js to also run `make stripe`
dev:
	node dev.js --stripe

build:
	npm run build

start:
	npm start

lint:
	npm run lint

test:
	npm test

# The API's port can change (PORT in server/.env), so instead of writing
# 3000 here we ask the computer which port the running API is using:
#   1. pgrep finds every `node ... src/index.js` process
#   2. lsof keeps the one started in this project's server/ folder
#      (another project could be running its own src/index.js)
#   3. lsof then prints the port that process is listening on
# `make dev` starts this at the same time as the API, so it tries once a
# second for 10 seconds while the API starts up. If the API still isn't
# running, it uses PORT from server/.env, then 3000.
# `exec` swaps the shell for stripe, so stopping make stops stripe too.
stripe:
	@for try in 1 2 3 4 5 6 7 8 9 10; do \
		port=$$(for pid in $$(pgrep -f 'src/index.js'); do \
			if lsof -a -p $$pid -d cwd -Fn 2>/dev/null | grep -qx "n$(CURDIR)/server"; then \
				lsof -a -p $$pid -iTCP -sTCP:LISTEN -P -n -Fn 2>/dev/null | sed -n 's/^n.*://p'; \
			fi; \
		done | head -1); \
		[ -n "$$port" ] && break; \
		sleep 1; \
	done; \
	if [ -z "$$port" ]; then \
		port=$$(grep -s '^PORT=' server/.env | cut -d= -f2); \
		port=$${port:-3000}; \
		echo "The API isn't running, so using port $$port (start it with: make dev)"; \
	fi; \
	echo "Forwarding Stripe webhooks to localhost:$$port"; \
	exec stripe listen --all-snapshot --forward-to localhost:$$port/api/webhooks/stripe
