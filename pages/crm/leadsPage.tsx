import React from "react";
import {useState, useEffect} from "react";
import { useAuth } from "../../contexts/AuthContext";
import {db} from "../../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";


const LeadsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const []