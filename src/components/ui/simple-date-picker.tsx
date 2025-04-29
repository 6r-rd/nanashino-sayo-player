import * as React from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

interface SimpleDatePickerProps {
  date?: Date
  setDate: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function SimpleDatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  className,
}: SimpleDatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleClickOutside = React.useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setOpen(false)
    }
  }, [])

  React.useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, handleClickOutside])

  const handleSelect = React.useCallback(
    (day: Date | undefined) => {
      setDate(day)
      if (day) {
        setOpen(false)
      }
    },
    [setDate]
  )

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        className={cn(
          "w-full h-10 justify-start text-left font-normal",
          !date && "text-muted-foreground",
          className
        )}
        onClick={() => setOpen(!open)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? format(date, "PPP", { locale: ja }) : <span>{placeholder}</span>}
      </Button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 bg-popover text-popover-foreground rounded-md border shadow-md min-w-[280px]">
          <div className="flex flex-col">
            <div className="flex justify-between items-center p-2">
              <button
                onClick={() => {
                  const prevMonth = new Date(date || new Date());
                  prevMonth.setMonth(prevMonth.getMonth() - 1);
                  setDate(prevMonth);
                }}
                className="p-1 rounded-md hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-medium">
                {date ? format(date, "yyyy年MM月", { locale: ja }) : format(new Date(), "yyyy年MM月", { locale: ja })}
              </div>
              <button
                onClick={() => {
                  const nextMonth = new Date(date || new Date());
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  setDate(nextMonth);
                }}
                className="p-1 rounded-md hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              defaultMonth={date}
              locale={ja}
              className="[&_table]:mt-0"
              components={{
                Caption: () => null
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
