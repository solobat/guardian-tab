import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { useState, useEffect } from 'react'

dayjs.extend(duration)

const useTimeRemaining = (startTime: number, endTime: number) => {
  const [timeRemaining, setTimeRemaining] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = dayjs()
      const start = dayjs(startTime)
      const end = dayjs(endTime)

      const formatDuration = (duration: any) => {
        const days = duration.days()
        const hours = duration.hours()
        const minutes = duration.minutes()
        const seconds = duration.seconds()
        return `${days}天${hours}时${minutes}分${seconds}秒`
      }

      if (now.isBefore(start)) {
        const diff = dayjs.duration(start.diff(now))
        setTimeRemaining(`距: ${formatDuration(diff)}`)
        setIsUrgent(diff.asDays() < 1)
      } else if (now.isBefore(end)) {
        const diff = dayjs.duration(end.diff(now))
        setTimeRemaining(`剩: ${formatDuration(diff)}`)
        setIsUrgent(diff.asDays() < 1)
      } else {
        setTimeRemaining('已结束')
        setIsUrgent(false)
      }
    }

    updateTimeRemaining()
    const timer = setInterval(updateTimeRemaining, 1000)

    return () => clearInterval(timer)
  }, [startTime, endTime])

  return { timeRemaining, isUrgent }
}

export default useTimeRemaining
