.PHONY: check
check: jutil.ts
	tsc --noEmit --lib es5 --strict jutil.ts
