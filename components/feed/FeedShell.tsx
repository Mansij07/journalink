import type { ReactNode } from "react"

interface FeedShellProps {
  left: ReactNode
  right: ReactNode
  children: ReactNode
}

export function FeedShell({ left, right, children }: FeedShellProps) {
  return (
    <div className="min-h-screen flex-1 text-foreground">
      <div className="mx-auto px-5 pt-6 pb-10" style={{ maxWidth: "1600px" }}>
        <div className="flex items-start gap-6">
          <aside
            className="hidden xl:block shrink-0 sticky top-[88px] overflow-y-auto"
            style={{ width: "260px", maxHeight: "calc(100vh - 104px)" }}
          >
            {left}
          </aside>

          <main className="flex-1 min-w-0">{children}</main>

          <aside
            className="hidden xl:block shrink-0 sticky top-[88px] overflow-y-auto"
            style={{ width: "260px", maxHeight: "calc(100vh - 104px)" }}
          >
            {right}
          </aside>
        </div>
      </div>
    </div>
  )
}
