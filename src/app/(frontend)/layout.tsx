import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Find the world on a 3D globe. Race the clock, then battle head-to-head.',
  title: 'Terra Tap',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
