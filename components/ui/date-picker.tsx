"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"

interface DatePickerProps {
  /** Selected date as a "yyyy-MM-dd" string, or "" when empty. */
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
}

/**
 * A calendar date picker that opens from a dropdown trigger. Speaks "yyyy-MM-dd"
 * strings (or "") so it drops into the existing form/API/display pipeline that
 * stores dates as that string. Parsing/formatting goes through date-fns in local
 * time to avoid the UTC off-by-one of `new Date("yyyy-mm-dd")`.
 */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-8 w-full justify-start rounded-lg border-input font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="size-4" />
          {selected ? format(selected, "PPP") : placeholder}
        </Button>
      </DropdownMenuTrigger>
      {/* w-auto p-0 overrides the dropdown's default min-width/padding. */}
      <DropdownMenuContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) onChange(format(d, "yyyy-MM-dd"))
            setOpen(false)
          }}
          autoFocus
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
