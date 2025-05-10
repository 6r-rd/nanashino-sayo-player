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
  mobileAlign?: "left" | "right"; // New prop
}

export function SimpleDatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  className,
  mobileAlign = "left", // Default to "left"
}: SimpleDatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [displayedMonth, setDisplayedMonth] = React.useState<Date>(() => date || new Date());
  const [isMobile, setIsMobile] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (open) {
      // When the calendar opens, reset displayedMonth to the currently selected date or today
      setDisplayedMonth(date || new Date());
    }
  }, [open]); // Rerun when the popover open state changes

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Using 768px as the breakpoint for mobile
    };
    checkMobile(); // Initial check
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
        <div className={cn(
          "absolute top-full z-50 mt-2 bg-popover text-popover-foreground rounded-md border shadow-md min-w-[280px]",
          // Updated logic:
          isMobile && mobileAlign === "right" ? "right-0" : "left-0"
        )}>
          <div className="flex flex-col">
            <div className="flex justify-between items-center p-2">
              <button
                onClick={() => {
                  setDisplayedMonth(current => {
                    const newDisplayedMonth = new Date(current);
                    newDisplayedMonth.setMonth(newDisplayedMonth.getMonth() - 1);
                    return newDisplayedMonth;
                  });
                }}
                className="p-1 rounded-md hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-medium">
                {format(displayedMonth, "yyyy年MM月", { locale: ja })}
              </div>
              <button
                onClick={() => {
                  setDisplayedMonth(current => {
                    const newDisplayedMonth = new Date(current);
                    newDisplayedMonth.setMonth(newDisplayedMonth.getMonth() + 1);
                    return newDisplayedMonth;
                  });
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
              month={displayedMonth}
              onMonthChange={setDisplayedMonth}
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
