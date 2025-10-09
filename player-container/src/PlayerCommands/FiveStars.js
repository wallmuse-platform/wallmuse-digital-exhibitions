import React from "react";
import Rating from '@mui/material/Rating';

export function FiveStars() {
    return (
            <Rating name="half-rating" defaultValue={2.5} precision={0.5} />
    );
}