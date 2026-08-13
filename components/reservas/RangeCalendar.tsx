"use client";

import { useLocale } from "next-intl";
import { es as esLocale, enUS, ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { addDays } from "date-fns";
import "react-day-picker/style.css";
import {
  pickDay,
  rangeHasBlocked,
  firstBlockedAfter,
  type RangeValue,
} from "@/lib/reservation/range";
import { minimumNights } from "@/lib/reservation/stay-rules";

interface RangeCalendarProps {
  value: RangeValue;
  onChange: (next: RangeValue) => void;
  disabledDates?: Date[];
}

export function RangeCalendar({ value, onChange, disabledDates = [] }: RangeCalendarProps) {
  const locale = useLocale();
  const dateFnsLocale =
    locale === "en" ? enUS : locale === "pt" ? ptBR : esLocale;
  const { checkIn, checkOut } = value;

  const modifiers = {
    rangeStart: checkIn ? [checkIn] : [],
    rangeEnd: checkOut ? [checkOut] : [],
    rangeMiddle: (day: Date) => !!checkIn && !!checkOut && day > checkIn && day < checkOut,
  };
  const modifiersClassNames = {
    rangeStart: "rdp-lago-end",
    rangeEnd: "rdp-lago-end",
    rangeMiddle: "rdp-lago-middle",
  };

  // Fase de salida: hay llegada elegida y falta el check-out. Ahí el rango se
  // topea en la primera noche ocupada, para que no se pueda saltar el bloque
  // eligiendo llegada antes y salida después (ambas puntas están libres, así
  // que deshabilitar solo los días ocupados no alcanza).
  const pickingDeparture = checkIn !== null && checkOut === null;
  const maxCheckOut = pickingDeparture ? firstBlockedAfter(checkIn, disabledDates) : null;
  const minCheckOut = pickingDeparture ? addDays(checkIn, minimumNights(checkIn)) : null;

  // Esa noche tope sigue siendo elegible como salida: el check-out es exclusivo
  // (turnover), y el servidor acepta ese rango.
  const blocked = maxCheckOut
    ? disabledDates.filter((d) => d.getTime() !== maxCheckOut.getTime())
    : disabledDates;

  return (
    <DayPicker
      locale={dateFnsLocale}
      defaultMonth={checkIn ?? new Date()}
      weekStartsOn={1}
      disabled={[
        { before: new Date() },
        ...(minCheckOut ? [{ before: minCheckOut }] : []),
        ...(maxCheckOut ? [{ after: maxCheckOut }] : []),
        ...blocked,
      ]}
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      onDayClick={(day) => {
        // Guarda de último recurso, por si la disponibilidad llegó tarde.
        if (pickingDeparture && minCheckOut && day < minCheckOut) return;
        if (pickingDeparture && day > checkIn && rangeHasBlocked(checkIn, day, disabledDates)) return;
        onChange(pickDay(value, day));
      }}
    />
  );
}
