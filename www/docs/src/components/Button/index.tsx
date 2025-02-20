import React from "react"
import clsx from "clsx"

export type ButtonProps = {
  btnTypeClassName?: string
  className?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
} & React.HTMLAttributes<HTMLButtonElement>

const Button: React.FC<ButtonProps> = ({
  className = "",
  btnTypeClassName,
  onClick,
  children,
  ...props
}) => {
  return (
    <button
      className={clsx(
        !btnTypeClassName?.length && "btn-secondary",
        btnTypeClassName,
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
