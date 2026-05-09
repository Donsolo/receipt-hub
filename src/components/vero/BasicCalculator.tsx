"use client";

import React, { useEffect } from 'react';
import { useCalculator } from '@/hooks/useCalculator';
import { clsx } from 'clsx';

export default function BasicCalculator() {
    const calc = useCalculator();

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                calc.inputDigit(e.key);
            } else if (e.key === '.') {
                calc.inputDecimal();
            } else if (e.key === 'Backspace') {
                calc.deleteLast();
            } else if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                calc.performOperation('=');
            } else if (e.key === '+') {
                calc.performOperation('+');
            } else if (e.key === '-') {
                calc.performOperation('-');
            } else if (e.key === '*') {
                calc.performOperation('*');
            } else if (e.key === '/') {
                e.preventDefault();
                calc.performOperation('/');
            } else if (e.key === 'Escape') {
                calc.clear();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [calc]);

    // Format for display (commas)
    const displayValue = calc.currentValue === 'Error' 
        ? 'Error' 
        : (() => {
            const parts = calc.currentValue.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join('.');
        })();

    const renderButton = (label: string, onClick: () => void, variant: 'default' | 'operator' | 'action' = 'default', extraClass = '') => {
        const baseClass = "w-full h-full min-h-[44px] rounded-2xl text-xl sm:text-2xl font-medium transition-all active:scale-95 flex items-center justify-center select-none shadow-sm";
        let variantClass = "";
        
        switch (variant) {
            case 'default':
                variantClass = "bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--text)] border border-[var(--border)]";
                break;
            case 'operator':
                variantClass = "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20";
                break;
            case 'action':
                variantClass = "bg-gray-500/10 hover:bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/20";
                break;
        }

        return (
            <button
                onClick={(e) => {
                    e.currentTarget.blur();
                    onClick();
                }}
                className={clsx(baseClass, variantClass, extraClass)}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg)] p-3 sm:p-5 select-none overflow-hidden">
            {/* Display Screen */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 mb-4 flex flex-col justify-end shadow-inner shrink-0 h-24 sm:h-28">
                <div className="text-right text-[var(--muted)] text-sm sm:text-base font-medium min-h-[24px]">
                    {calc.operator ? String(calc.operator) : ''}
                </div>
                <div className="text-right text-3xl sm:text-4xl font-light text-[var(--text)] truncate tracking-tight">
                    {displayValue}
                </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 grid-rows-5 gap-2 sm:gap-3 flex-1 min-h-0 pb-1">
                {renderButton('C', () => calc.clear(), 'action')}
                {renderButton('⌫', () => calc.deleteLast(), 'action')}
                {renderButton('/', () => calc.performOperation('/'), 'operator', calc.operator === '/' ? 'ring-2 ring-indigo-500' : '')}
                {renderButton('×', () => calc.performOperation('*'), 'operator', calc.operator === '*' ? 'ring-2 ring-indigo-500' : '')}

                {renderButton('7', () => calc.inputDigit('7'))}
                {renderButton('8', () => calc.inputDigit('8'))}
                {renderButton('9', () => calc.inputDigit('9'))}
                {renderButton('-', () => calc.performOperation('-'), 'operator', calc.operator === '-' ? 'ring-2 ring-indigo-500' : '')}

                {renderButton('4', () => calc.inputDigit('4'))}
                {renderButton('5', () => calc.inputDigit('5'))}
                {renderButton('6', () => calc.inputDigit('6'))}
                {renderButton('+', () => calc.performOperation('+'), 'operator', calc.operator === '+' ? 'ring-2 ring-indigo-500' : '')}

                {renderButton('1', () => calc.inputDigit('1'))}
                {renderButton('2', () => calc.inputDigit('2'))}
                {renderButton('3', () => calc.inputDigit('3'))}
                <button
                    onClick={() => calc.performOperation('=')}
                    className="col-start-4 row-start-4 row-span-2 w-full h-full min-h-[44px] bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-2xl font-medium transition-all active:scale-95 shadow-md shadow-indigo-500/20 flex items-center justify-center"
                >
                    =
                </button>

                {renderButton('0', () => calc.inputDigit('0'), 'default', 'col-span-2')}
                {renderButton('.', () => calc.inputDecimal())}
            </div>
        </div>
    );
}
