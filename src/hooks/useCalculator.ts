import { useState, useCallback } from 'react';

export type Operator = '+' | '-' | '*' | '/' | null;

export function useCalculator() {
    const [currentValue, setCurrentValue] = useState<string>('0');
    const [previousValue, setPreviousValue] = useState<string | null>(null);
    const [operator, setOperator] = useState<Operator>(null);
    const [waitingForNewValue, setWaitingForNewValue] = useState<boolean>(false);

    const clear = useCallback(() => {
        setCurrentValue('0');
        setPreviousValue(null);
        setOperator(null);
        setWaitingForNewValue(false);
    }, []);

    const inputDigit = useCallback((digit: string) => {
        if (waitingForNewValue) {
            setCurrentValue(digit);
            setWaitingForNewValue(false);
        } else {
            // Prevent absurdly long numbers
            if (currentValue.replace(/[^0-9]/g, '').length >= 15) return;
            setCurrentValue(currentValue === '0' ? digit : currentValue + digit);
        }
    }, [currentValue, waitingForNewValue]);

    const inputDecimal = useCallback(() => {
        if (waitingForNewValue) {
            setCurrentValue('0.');
            setWaitingForNewValue(false);
            return;
        }

        if (!currentValue.includes('.')) {
            setCurrentValue(currentValue + '.');
        }
    }, [currentValue, waitingForNewValue]);

    const deleteLast = useCallback(() => {
        if (waitingForNewValue) return;
        if (currentValue === 'Error') {
            clear();
            return;
        }
        if (currentValue.length === 1 || (currentValue.length === 2 && currentValue.startsWith('-'))) {
            setCurrentValue('0');
        } else {
            setCurrentValue(currentValue.slice(0, -1));
        }
    }, [currentValue, waitingForNewValue, clear]);

    const performOperation = useCallback((nextOperator: Operator | '=') => {
        if (currentValue === 'Error') {
            clear();
            return;
        }

        const inputValue = parseFloat(currentValue);

        if (previousValue == null) {
            setPreviousValue(currentValue);
        } else if (operator && !waitingForNewValue) {
            const currentValueNum = inputValue;
            const previousValueNum = parseFloat(previousValue);
            let newValue = 0;

            if (operator === '+') {
                newValue = previousValueNum + currentValueNum;
            } else if (operator === '-') {
                newValue = previousValueNum - currentValueNum;
            } else if (operator === '*') {
                newValue = previousValueNum * currentValueNum;
            } else if (operator === '/') {
                if (currentValueNum === 0) {
                    setCurrentValue('Error');
                    setPreviousValue(null);
                    setOperator(null);
                    setWaitingForNewValue(true);
                    return;
                }
                newValue = previousValueNum / currentValueNum;
            }

            // Fix JS floating point issues
            newValue = Math.round(newValue * 100000000) / 100000000;
            const resultString = String(newValue);

            setCurrentValue(resultString);
            setPreviousValue(resultString);
        }

        setWaitingForNewValue(true);
        if (nextOperator !== '=') {
            setOperator(nextOperator as Operator);
        } else {
            setOperator(null);
        }
    }, [currentValue, previousValue, operator, waitingForNewValue, clear]);

    return {
        currentValue,
        operator,
        waitingForNewValue,
        inputDigit,
        inputDecimal,
        clear,
        deleteLast,
        performOperation,
    };
}
