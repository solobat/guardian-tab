import dayjs from 'dayjs'

export const getTimeRemaining = (endTime: number) => {
  const now = dayjs()
  const end = dayjs(endTime)
  const diff = end.diff(now, 'second')

  if (diff <= 0) {
    return '已结束'
  }

  const days = Math.floor(diff / (24 * 60 * 60))
  const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((diff % (60 * 60)) / 60)

  return `${days}天 ${hours}小时 ${minutes}分钟`
}
