import { useState } from "react"
import TextType from "@/components/TextType"

interface TypingTitleProps {
  text: string
  className?: string
  typingSpeed?: number
}

/** TextType wrapper that hides the blinking cursor once typing finishes. */
export default function TypingTitle({ text, className, typingSpeed = 35 }: TypingTitleProps) {
  const [done, setDone] = useState(false)

  return (
    <TextType
      text={text}
      typingSpeed={typingSpeed}
      loop={false}
      showCursor={!done}
      cursorCharacter="_"
      cursorClassName="text-accent"
      className={className}
      onSentenceComplete={() => setDone(true)}
    />
  )
}
