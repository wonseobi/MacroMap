import { useState, useEffect } from "react"
import TextType from "@/components/TextType"

interface TypingTitleProps {
  text: string
  className?: string
  typingSpeed?: number
}

export default function TypingTitle({ text, className, typingSpeed = 35 }: TypingTitleProps) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDone(false)
    const ms = text.length * typingSpeed + 400
    const t = setTimeout(() => setDone(true), ms)
    return () => clearTimeout(t)
  }, [text, typingSpeed])

  // Match TextType's own wrapper classes so letter-spacing/layout doesn't shift
  // when we swap the animated component for the static one.
  if (done)
    return (
      <div className={`inline-block whitespace-pre-wrap tracking-tight ${className ?? ""}`}>
        {text}
      </div>
    )

  return (
    <TextType
      text={text}
      typingSpeed={typingSpeed}
      loop={false}
      showCursor={true}
      cursorCharacter="_"
      cursorClassName="text-accent"
      className={className}
    />
  )
}
